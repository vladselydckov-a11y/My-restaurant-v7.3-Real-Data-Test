import { buildDynamicSummary, formatMoney } from './sampleData';

export async function supabaseFetch(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE key is missing');

  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  return response.json();
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sum(list, field) {
  return list.reduce((total, item) => total + toNumber(item[field]), 0);
}

function average(list, field) {
  if (!list.length) return 0;
  return list.reduce((total, item) => total + toNumber(item[field]), 0) / list.length;
}

function weightedPercent(rows, percentField = 'foodcost_percent', weightField = 'revenue') {
  const totalWeight = sum(rows, weightField);
  if (!totalWeight) return average(rows, percentField);
  return rows.reduce((total, row) => total + toNumber(row[percentField]) * toNumber(row[weightField]), 0) / totalWeight;
}

function percent(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function statusFromDelta(value, goodWhenPositive = true) {
  if (Math.abs(value) < 0.05) return 'neutral';
  return goodWhenPositive ? (value > 0 ? 'good' : 'bad') : (value > 0 ? 'bad' : 'good');
}

function buildInFilter(field, values) {
  const unique = [...new Set(values.filter(Boolean))];
  if (!unique.length) return '';
  return `&${field}=in.(${unique.join(',')})`;
}

function latestDate(rows) {
  return rows.map((row) => row.business_date).filter(Boolean).sort().at(-1);
}

function dateMinusDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function ruDay(dateString) {
  const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const day = new Date(`${dateString}T00:00:00.000Z`).getUTCDay();
  return names[day] || dateString;
}

function groupBy(list, keyFn) {
  return list.reduce((map, item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
}

function metric(label, key, raw, delta, status, formatter = formatMoney) {
  return { key, label, value: formatter(raw), raw, delta, status };
}

async function getKpiSettings(restaurantIds) {
  const filter = buildInFilter('restaurant_id', restaurantIds);
  const rows = await supabaseFetch(`/rest/v1/kpi_settings?select=restaurant_id,daily_revenue_plan,avg_check_target,foodcost_max,discount_max${filter}`).catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

async function getRows(table, restaurantIds, startDate) {
  const filter = buildInFilter('restaurant_id', restaurantIds);
  const startFilter = startDate ? `&business_date=gte.${startDate}` : '';
  const rows = await supabaseFetch(`/rest/v1/${table}?select=*${filter}${startFilter}&order=business_date.desc&limit=2000`).catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

function aggregateDishes(rows) {
  const grouped = groupBy(rows, (row) => `${row.dish_name || 'Без названия'}|||${row.category_name || 'Меню'}`);
  const items = [...grouped.entries()].map(([key, list]) => {
    const [name, category] = key.split('|||');
    const revenue = sum(list, 'revenue');
    const cost = sum(list, 'cost');
    const quantity = sum(list, 'quantity');
    const foodcost = revenue ? Math.round((cost / revenue) * 100) : Math.round(weightedPercent(list));
    const margin = revenue ? Math.max(Math.round(((revenue - cost) / revenue) * 100), 0) : 0;
    return {
      name,
      category,
      amount: `${Math.round(quantity)} шт.`,
      rawAmount: quantity,
      revenue: formatMoney(revenue),
      rawRevenue: revenue,
      foodcost: `${foodcost}%`,
      margin: `${margin}%`,
      ai: foodcost > 35 ? 'Проверить себестоимость' : quantity < 20 ? 'Продвинуть в скриптах' : 'Норма'
    };
  });

  return items.sort((a, b) => b.rawRevenue - a.rawRevenue);
}

function aggregateWaiters(rows, avgCheckTarget) {
  const grouped = groupBy(rows, (row) => row.waiter_name || 'Без имени');
  return [...grouped.entries()].map(([name, list]) => {
    const revenue = sum(list, 'revenue');
    const checks = sum(list, 'checks_count');
    const avgCheck = checks ? Math.round(revenue / checks) : Math.round(average(list, 'avg_check'));
    return {
      name,
      checks,
      avgCheck: formatMoney(avgCheck),
      rawAvgCheck: avgCheck,
      revenue: formatMoney(revenue),
      rawRevenue: revenue,
      upsell: avgCheck >= avgCheckTarget ? 'сильная' : avgCheck >= avgCheckTarget * 0.9 ? 'средняя' : 'слабая',
      status: avgCheck >= avgCheckTarget ? 'Лидер / норма' : 'Нужна работа'
    };
  }).sort((a, b) => b.rawRevenue - a.rawRevenue);
}

function buildWeek(rows, currentDate) {
  const start = dateMinusDays(currentDate, 6);
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = dateMinusDays(currentDate, 6 - i);
    const list = rows.filter((row) => row.business_date === date);
    const revenue = sum(list, 'revenue');
    const checks = sum(list, 'checks_count');
    days.push({
      day: ruDay(date),
      date,
      revenue,
      checks,
      avgCheck: checks ? Math.round(revenue / checks) : Math.round(average(list, 'avg_check'))
    });
  }
  return days.filter((day) => day.date >= start);
}

function buildRestaurantCards(restaurants, dailyRows, kpis, currentDate) {
  return restaurants.map((restaurant) => {
    const row = dailyRows.find((item) => item.restaurant_id === restaurant.id && item.business_date === currentDate) || {};
    const kpi = kpis.find((item) => item.restaurant_id === restaurant.id) || {};
    const revenue = toNumber(row.revenue);
    const checks = toNumber(row.checks_count);
    const guests = toNumber(row.guests_count);
    const avgCheck = checks ? Math.round(revenue / checks) : Math.round(toNumber(row.avg_check));
    const plan = toNumber(row.plan_revenue) || toNumber(kpi.daily_revenue_plan) || 250000;
    const avgTarget = toNumber(kpi.avg_check_target) || 1450;
    const foodcost = toNumber(row.foodcost_percent);
    const foodTarget = toNumber(kpi.foodcost_max) || 30;
    const percentPlan = plan ? Math.round((revenue / plan) * 100) : 0;
    const status = percentPlan < 70 || avgCheck < avgTarget * 0.85 ? 'bad' : foodcost > foodTarget || avgCheck < avgTarget ? 'warn' : 'good';
    const problem = status === 'good' ? 'норма' : avgCheck < avgTarget ? 'средний чек' : foodcost > foodTarget ? 'фудкост' : 'выручка';
    return { id: restaurant.id, name: restaurant.name, city: restaurant.city || 'Город', revenue, plan, avgCheck, checks, guests, problem, status };
  });
}

export async function getSupabaseSummary({ restaurantId = 'all' } = {}) {
  const restaurants = await supabaseFetch('/rest/v1/restaurants?select=id,name,city,is_active&is_active=eq.true').catch(() => null);
  if (!Array.isArray(restaurants) || !restaurants.length) return null;

  const activeRestaurantIds = restaurantId === 'all'
    ? restaurants.map((item) => item.id)
    : [restaurantId];

  const selectedRestaurants = restaurantId === 'all'
    ? restaurants
    : restaurants.filter((item) => item.id === restaurantId);

  if (!selectedRestaurants.length) return null;

  const allRestaurantIds = restaurants.map((item) => item.id);
  const allKpis = await getKpiSettings(allRestaurantIds);
  const kpis = allKpis.filter((item) => activeRestaurantIds.includes(item.restaurant_id));
  const allDailyRows = await getRows('daily_sales', allRestaurantIds);
  const dailyRows = allDailyRows.filter((item) => activeRestaurantIds.includes(item.restaurant_id));
  if (!dailyRows.length) {
    const demo = buildDynamicSummary({ restaurantId });
    demo.dataMode = 'supabase_connected_no_sales';
    demo.network.restaurants = demo.network.restaurants.map((item, index) => {
      const real = restaurants[index];
      return real ? { ...item, id: real.id, name: real.name, city: real.city || item.city } : item;
    });
    demo.ai.summary = 'Supabase подключён, рестораны найдены, но таблица daily_sales пока пустая. Загрузи CSV из docs/demo-data или выгрузку iiko.';
    return demo;
  }

  const currentDate = latestDate(dailyRows);
  const start30 = dateMinusDays(currentDate, 29);
  const [dishRows, waiterRows] = await Promise.all([
    getRows('dish_sales', activeRestaurantIds, start30),
    getRows('waiter_sales', activeRestaurantIds, start30)
  ]);

  const currentRows = dailyRows.filter((row) => row.business_date === currentDate);
  const previousDate = dateMinusDays(currentDate, 1);
  const previousRows = dailyRows.filter((row) => row.business_date === previousDate);

  const revenue = sum(currentRows, 'revenue');
  const prevRevenue = sum(previousRows, 'revenue');
  const checks = sum(currentRows, 'checks_count');
  const prevChecks = sum(previousRows, 'checks_count');
  const guests = sum(currentRows, 'guests_count');
  const discounts = sum(currentRows, 'discounts');
  const prevDiscounts = sum(previousRows, 'discounts');
  const avgCheck = checks ? Math.round(revenue / checks) : Math.round(average(currentRows, 'avg_check'));
  const prevAvgCheck = prevChecks ? Math.round(prevRevenue / prevChecks) : Math.round(average(previousRows, 'avg_check'));
  const foodcost = Number(weightedPercent(currentRows).toFixed(1));
  const kpiBase = kpis[0] || {};
  const avgCheckTarget = toNumber(kpiBase.avg_check_target) || 1450;
  const foodcostTarget = toNumber(kpiBase.foodcost_max) || 30;
  const discountMax = toNumber(kpiBase.discount_max) || 9000;
  const planRevenue = sum(currentRows, 'plan_revenue') || selectedRestaurants.reduce((total, restaurant) => {
    const kpi = kpis.find((item) => item.restaurant_id === restaurant.id) || {};
    return total + (toNumber(kpi.daily_revenue_plan) || 250000);
  }, 0);

  const revenueDelta = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const checksDelta = prevChecks ? ((checks - prevChecks) / prevChecks) * 100 : 0;
  const avgCheckDelta = prevAvgCheck ? ((avgCheck - prevAvgCheck) / prevAvgCheck) * 100 : ((avgCheck - avgCheckTarget) / avgCheckTarget) * 100;
  const discountDelta = prevDiscounts ? ((discounts - prevDiscounts) / prevDiscounts) * 100 : 0;

  const allRestaurantCards = buildRestaurantCards(restaurants, allDailyRows, allKpis, currentDate);
  const networkRevenue = allRestaurantCards.reduce((total, item) => total + item.revenue, 0);
  const networkPlan = allRestaurantCards.reduce((total, item) => total + item.plan, 0);
  const networkChecks = allRestaurantCards.reduce((total, item) => total + item.checks, 0);
  const networkGuests = allRestaurantCards.reduce((total, item) => total + item.guests, 0);
  const networkAvgCheck = networkChecks ? Math.round(networkRevenue / networkChecks) : 0;

  const activeRestaurant = restaurantId === 'all'
    ? { id: 'all', name: 'Вся сеть', city: selectedRestaurants[0]?.city || 'Город', revenue, plan: planRevenue, avgCheck, checks, guests }
    : { id: selectedRestaurants[0].id, name: selectedRestaurants[0].name, city: selectedRestaurants[0].city || 'Город', revenue, plan: planRevenue, avgCheck, checks, guests };

  const topDishes = aggregateDishes(dishRows).slice(0, 6);
  const lowDishes = [...aggregateDishes(dishRows)]
    .filter((item) => item.rawRevenue > 0)
    .sort((a, b) => a.rawAmount - b.rawAmount || b.rawRevenue - a.rawRevenue)
    .slice(0, 4)
    .map((item) => ({ ...item, issue: item.rawAmount < 20 ? 'низкая продажа за 30 дней' : 'нужна проверка маржи', ai: item.rawAmount < 20 ? 'Вынести в комбо или убрать из фокуса' : item.ai }));
  const waiters = aggregateWaiters(waiterRows, avgCheckTarget).slice(0, 8);
  const weakWaiter = waiters.length ? [...waiters].sort((a, b) => a.rawAvgCheck - b.rawAvgCheck)[0] : null;

  const avgCheckLoss = Math.max((avgCheckTarget - avgCheck) * checks, 0);
  const foodcostLoss = Math.max(Math.round(revenue * ((foodcost - foodcostTarget) / 100)), 0);
  const discountLoss = Math.max(discounts - discountMax, 0);
  const planGap = Math.max(planRevenue - revenue, 0);
  const totalLoss = avgCheckLoss + foodcostLoss + discountLoss;
  const planPercent = planRevenue ? Math.round((revenue / planRevenue) * 100) : 0;
  const projectedEndDay = Math.round(revenue * 1.12);

  const metrics = [
    metric('Выручка', 'revenue', revenue, `${planPercent}% плана`, planPercent >= 80 ? 'good' : planPercent >= 65 ? 'warn' : 'bad'),
    metric('Чеки', 'checks', checks, percent(checksDelta), statusFromDelta(checksDelta), (value) => String(Math.round(value))),
    metric('Средний чек', 'avgCheck', avgCheck, percent(avgCheckDelta), avgCheck >= avgCheckTarget ? 'good' : 'bad'),
    metric('Гости', 'guests', guests, 'из daily_sales', 'good', (value) => String(Math.round(value))),
    metric('Фудкост', 'foodcost', foodcost, `${(foodcost - foodcostTarget).toFixed(1)} п.п.`, foodcost <= foodcostTarget ? 'good' : 'bad', (value) => `${Number(value).toFixed(1)}%`),
    metric('Скидки', 'discounts', discounts, percent(discountDelta), discounts <= discountMax ? 'good' : 'bad')
  ];

  const summary = buildDynamicSummary({ restaurantId });
  return {
    ...summary,
    dataMode: 'supabase_real_30_days_v7_3',
    generatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    selectedRestaurantId: activeRestaurant.id,
    restaurant: { id: activeRestaurant.id, name: activeRestaurant.name, city: activeRestaurant.city, currency: '₽' },
    period: { date: currentDate, title: 'Последний день в базе', compareTitle: 'к предыдущему дню' },
    plan: { dailyRevenue: planRevenue, avgCheck: avgCheckTarget, foodcostMax: foodcostTarget, discountMax },
    metrics,
    topDishes: topDishes.length ? topDishes : summary.topDishes,
    lowDishes: lowDishes.length ? lowDishes : summary.lowDishes,
    waiters: waiters.length ? waiters : summary.waiters,
    week: buildWeek(dailyRows, currentDate),
    network: {
      selectedRestaurantId: activeRestaurant.id,
      restaurants: allRestaurantCards,
      totals: {
        revenue: networkRevenue,
        plan: networkPlan,
        percent: networkPlan ? Math.round((networkRevenue / networkPlan) * 100) : 0,
        avgCheck: networkAvgCheck,
        checks: networkChecks,
        weakPoints: allRestaurantCards.filter((item) => item.status !== 'good').length
      },
      ai: `Режим v7.3: данные взяты из Supabase за ${start30} — ${currentDate}. Слабые места: ${avgCheck < avgCheckTarget ? 'средний чек' : 'чек в норме'}, ${foodcost > foodcostTarget ? 'фудкост выше нормы' : 'фудкост в норме'}, ${discounts > discountMax ? 'скидки выше лимита' : 'скидки под контролем'}.`
    },
    moneyLosses: [
      { title: 'План-факт выручки', amount: planGap, reason: `${planPercent}% от плана ${formatMoney(planRevenue)}`, action: 'Проверить вечерний прогноз, трафик и средний чек.', level: planGap > 0 ? 'warn' : 'good' },
      { title: 'Средний чек ниже цели', amount: avgCheckLoss, reason: `${checks} чеков × недобор ${formatMoney(Math.max(avgCheckTarget - avgCheck, 0))}`, action: 'Допродажа напитков, десертов и комбо.', level: avgCheckLoss > 0 ? 'bad' : 'good' },
      { title: 'Фудкост выше нормы', amount: foodcostLoss, reason: `${foodcost}% против нормы ${foodcostTarget}%`, action: 'Проверить себестоимость топ-блюд и списания.', level: foodcostLoss > 0 ? 'bad' : 'good' },
      { title: 'Скидки выше лимита', amount: discountLoss, reason: `${formatMoney(discounts)} против лимита ${formatMoney(discountMax)}`, action: 'Разобрать скидки по сменам и сотрудникам.', level: discountLoss > 0 ? 'warn' : 'good' }
    ],
    totalLoss,
    actionPlan: [
      { role: 'Владелец', title: 'Посмотреть 3 отклонения', text: `Фокус: план-факт ${planPercent}%, средний чек ${formatMoney(avgCheck)}, фудкост ${foodcost}%.` },
      { role: 'Управляющий', title: 'Поставить задачу смене', text: weakWaiter ? `Разобрать чек у сотрудника ${weakWaiter.name}: ${weakWaiter.avgCheck}.` : 'Проверить допродажи по официантам.' },
      { role: 'Шеф-повар', title: 'Проверить маржу меню', text: topDishes[0] ? `Начать с блюда ${topDishes[0].name}: выручка ${topDishes[0].revenue}, фудкост ${topDishes[0].foodcost}.` : 'Загрузить dish_sales для анализа меню.' },
      { role: 'Маркетинг', title: 'Собрать комбо', text: 'Поднять средний чек без большой скидки: напиток + десерт, бургер + гарнир, кофе + десерт.' }
    ],
    teamScript: `Фокус смены: средний чек ${formatMoney(avgCheck)} при цели ${formatMoney(avgCheckTarget)}. Предлагаем напиток/десерт к каждому второму чеку. Отдельно контролируем скидки: сейчас ${formatMoney(discounts)}.`,
    forecast: {
      current: revenue,
      plan: planRevenue,
      projected: projectedEndDay,
      risk: projectedEndDay < planRevenue ? 'Риск не выполнить план' : 'План можно выполнить при текущем темпе',
      gap: planRevenue - projectedEndDay,
      confidence: dailyRows.length >= 14 ? 82 : 64,
      recommendations: [
        'Проверить выполнение плана к 16:00.',
        'Поставить официантам конкретный скрипт допродажи.',
        'Разобрать скидки выше лимита.',
        'Сверить фудкост блюд, которые дают большую выручку.'
      ]
    },
    kpiSettings: [
      { name: 'План выручки', value: formatMoney(planRevenue), status: `${planPercent}% выполнения` },
      { name: 'Цель среднего чека', value: formatMoney(avgCheckTarget), status: avgCheck >= avgCheckTarget ? 'выполнена' : 'ниже цели' },
      { name: 'Норма фудкоста', value: `${foodcostTarget}%`, status: foodcost <= foodcostTarget ? 'норма' : 'превышена' },
      { name: 'Лимит скидок', value: formatMoney(discountMax), status: discounts <= discountMax ? 'норма' : 'превышен' }
    ],
    alerts: [
      { level: planPercent < 80 ? 'warn' : 'good', title: 'План-факт', text: `Выручка ${formatMoney(revenue)} из ${formatMoney(planRevenue)}: ${planPercent}% плана.` },
      { level: avgCheck >= avgCheckTarget ? 'good' : 'bad', title: 'Средний чек', text: `${formatMoney(avgCheck)} против цели ${formatMoney(avgCheckTarget)}.` },
      { level: foodcost <= foodcostTarget ? 'good' : 'bad', title: 'Фудкост', text: `${foodcost}% против нормы ${foodcostTarget}%.` },
      { level: discounts <= discountMax ? 'good' : 'warn', title: 'Скидки', text: `${formatMoney(discounts)} против лимита ${formatMoney(discountMax)}.` }
    ],
    problems: [
      { level: avgCheckLoss > 0 ? 'bad' : 'good', title: 'Средний чек', impact: `-${formatMoney(avgCheckLoss)}`, reason: `Факт ${formatMoney(avgCheck)}, цель ${formatMoney(avgCheckTarget)}.`, actions: ['Скрипт допродажи напитков и десертов.', 'Разобрать слабых официантов.', 'Проверить средний чек по сменам.'] },
      { level: foodcostLoss > 0 ? 'bad' : 'good', title: 'Фудкост', impact: `-${formatMoney(foodcostLoss)}`, reason: `Факт ${foodcost}%, норма ${foodcostTarget}%.`, actions: ['Проверить себестоимость топ-блюд.', 'Сравнить закупочные цены.', 'Проверить списания.'] },
      { level: discountLoss > 0 ? 'warn' : 'good', title: 'Скидки', impact: `-${formatMoney(discountLoss)}`, reason: `Скидки ${formatMoney(discounts)}, лимит ${formatMoney(discountMax)}.`, actions: ['Проверить ручные скидки.', 'Разобрать скидки по сотрудникам.', 'Ограничить скидки без причины.'] }
    ],
    dataSources: [
      { name: 'Supabase', status: 'real 30 days connected', hint: 'daily_sales, dish_sales, waiter_sales реально агрегируются в /api/summary.' },
      { name: 'iiko / Excel', status: 'через выгрузку', hint: 'Загрузи CSV из docs/demo-data или реальную выгрузку клиента.' },
      { name: 'n8n', status: 'следующий этап', hint: 'Автоматизирует регулярную загрузку, когда клиент готов платить за автосвязку.' }
    ],
    ai: {
      summary: `v7.3 читает фактические таблицы Supabase. За последний день: выручка ${formatMoney(revenue)}, чек ${formatMoney(avgCheck)}, фудкост ${foodcost}%, скидки ${formatMoney(discounts)}.`,
      recommendations: ['Проверить план-факт.', 'Поднять средний чек через скрипты.', 'Проверить фудкост топ-блюд.', 'Разобрать скидки и слабых сотрудников.'],
      exampleQuestions: ['Что видно по реальным данным?', 'Где ресторан теряет деньги?', 'Какие блюда стоит продвигать?', 'Кто из официантов просел?', 'Сформируй отчёт владельцу']
    }
  };
}
