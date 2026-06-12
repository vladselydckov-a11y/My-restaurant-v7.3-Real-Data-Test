'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const tabs = [
  { id: 'today', label: 'День' },
  { id: 'network', label: 'Сеть' },
  { id: 'losses', label: 'Риски' },
  { id: 'actions', label: 'План' },
  { id: 'forecast', label: 'Прогноз' },
  { id: 'shifts', label: 'Смены' },
  { id: 'week', label: 'Неделя' },
  { id: 'orders', label: 'Заказы' },
  { id: 'problems', label: 'Контроль' },
  { id: 'team', label: 'Команда' },
  { id: 'dishes', label: 'Блюда' },
  { id: 'chat', label: 'AI-чат' },
  { id: 'report', label: 'Отчёт' },
  { id: 'notify', label: 'Уведомл.' },
  { id: 'access', label: 'Доступ' },
  { id: 'manage', label: 'Управление' },
  { id: 'import', label: 'Импорт' },
  { id: 'audit', label: 'AI-анализ' },
  { id: 'tasks', label: 'Задачи' },
  { id: 'presentation', label: 'Демо' }
];

const demoMenuItems = [
  { name: 'Пицца Пепперони', category: 'Пицца', price: 920, margin: 62 },
  { name: 'Цезарь с курицей', category: 'Салаты', price: 810, margin: 58 },
  { name: 'Бургер BBQ', category: 'Бургеры', price: 890, margin: 55 },
  { name: 'Паста Карбонара', category: 'Паста', price: 900, margin: 57 },
  { name: 'Чизкейк', category: 'Десерты', price: 650, margin: 72 },
  { name: 'Морс ягодный', category: 'Напитки', price: 350, margin: 80 },
  { name: 'Латте', category: 'Напитки', price: 400, margin: 74 },
  { name: 'Картофель фри', category: 'Закуски', price: 300, margin: 68 }
];

const demoWaiters = ['Анна', 'Илья', 'Максим', 'София'];
const demoChannels = ['Зал', 'Доставка', 'Самовывоз'];

const demoScenarios = {
  normal: { name: 'Обычная смена', description: 'Ровный поток заказов без сильных отклонений.', speed: 2500, minItems: 1, maxItems: 3, discountChance: 0.1, kitchenRisk: 0.15, forceLowCheck: false, preferredCategories: [] },
  lunch: { name: 'Обеденный пик', description: 'Заказы идут быстрее, кухня и зал загружены.', speed: 1300, minItems: 1, maxItems: 3, discountChance: 0.08, kitchenRisk: 0.45, forceLowCheck: false, preferredCategories: ['Паста', 'Салаты', 'Бургеры'] },
  lowCheck: { name: 'Просадка среднего чека', description: 'Много коротких заказов без напитков и десертов.', speed: 2100, minItems: 1, maxItems: 1, discountChance: 0.06, kitchenRisk: 0.1, forceLowCheck: true, preferredCategories: ['Закуски', 'Напитки'] },
  discounts: { name: 'Рост скидок', description: 'Скидки и промо начинают съедать выручку.', speed: 2000, minItems: 1, maxItems: 3, discountChance: 0.55, kitchenRisk: 0.18, forceLowCheck: false, preferredCategories: [] },
  kitchen: { name: 'Кухня перегружена', description: 'Много заказов зависает в статусе “готовится”.', speed: 1500, minItems: 2, maxItems: 4, discountChance: 0.12, kitchenRisk: 0.8, forceLowCheck: false, preferredCategories: ['Пицца', 'Паста', 'Бургеры'] }
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chooseMenuItem(scenario) {
  const preferred = scenario.preferredCategories?.length ? demoMenuItems.filter((item) => scenario.preferredCategories.includes(item.category)) : demoMenuItems;
  return pickRandom(preferred.length ? preferred : demoMenuItems);
}

function createDemoOrder(id, scenarioKey = 'normal') {
  const scenario = demoScenarios[scenarioKey] || demoScenarios.normal;
  const range = Math.max(scenario.maxItems - scenario.minItems + 1, 1);
  const itemCount = scenario.minItems + Math.floor(Math.random() * range);
  const items = [];

  for (let i = 0; i < itemCount; i += 1) {
    const item = chooseMenuItem(scenario);
    const quantity = Math.random() > 0.82 && !scenario.forceLowCheck ? 2 : 1;
    items.push({ ...item, quantity });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.random() < scenario.discountChance ? Math.round(subtotal * (0.08 + Math.random() * 0.12)) : 0;
  const total = Math.max(subtotal - discount, 0);
  const channel = pickRandom(demoChannels);
  const now = new Date();

  return {
    id: 1000 + id,
    time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    table: channel === 'Зал' ? `Стол ${Math.floor(Math.random() * 12) + 1}` : channel,
    channel,
    waiter: pickRandom(demoWaiters),
    items,
    subtotal,
    discount,
    total,
    kitchenRisk: scenario.kitchenRisk,
    status: 'новый'
  };
}

function promoteStatus(order) {
  if (order.status === 'новый') return Math.random() > 0.25 ? { ...order, status: 'готовится' } : order;
  if (order.status === 'готовится') return Math.random() < order.kitchenRisk ? order : { ...order, status: 'выдан' };
  return order;
}

function MetricCard({ metric }) {
  return (
    <div className="card metric-card">
      <div className="metric-label">{metric.label}</div>
      <div className="metric-value">{metric.value}</div>
      <div className={`delta ${metric.status}`}>{metric.delta}</div>
    </div>
  );
}

function PlanFactCard({ summary }) {
  const revenue = summary.metrics.find((m) => m.key === 'revenue')?.raw || 0;
  const plan = summary.plan?.dailyRevenue || 250000;
  const percent = Math.min(Math.round((revenue / plan) * 100), 100);
  const left = Math.max(plan - revenue, 0);
  return (
    <div className="card plan-card">
      <div className="plan-head">
        <div>
          <div className="metric-label">План-факт дня</div>
          <h3>{formatMoney(revenue)} из {formatMoney(plan)}</h3>
        </div>
        <div className="plan-percent">{percent}%</div>
      </div>
      <div className="progress-bg"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
      <div className="plan-foot">
        <span>До плана: {formatMoney(left)}</span>
        <span>Цель среднего чека: {formatMoney(summary.plan?.avgCheck || 1450)}</span>
      </div>
    </div>
  );
}

function LiveHeader({ summary }) {
  return (
    <div className="live-mini">
      <span className="live-dot on" />
      <span>Demo-live обновлено: {summary.generatedAt}</span>
    </div>
  );
}

function RankingTable({ items, type }) {
  return (
    <div className="card table">
      {items.map((item, index) => (
        <div className="row" key={`${item.name}-${index}`}>
          <div className="rank">{index + 1}</div>
          <div>
            <div className="name">{item.name}</div>
            <div className="small">
              {type === 'waiters'
                ? `${item.checks} чеков • ср. чек ${item.avgCheck} • ${item.upsell || 'допродажа'}`
                : item.issue
                  ? `${item.category} • ${item.issue}`
                  : `${item.category} • ${item.amount} • ${item.foodcost || ''}`}
            </div>
          </div>
          <div className="money">{item.revenue}</div>
        </div>
      ))}
    </div>
  );
}

function WeekBars({ days }) {
  const max = Math.max(...days.map((day) => day.revenue), 1);
  return (
    <div className="card">
      {days.map((day) => (
        <div key={day.day} className="bar-line">
          <div className="bar-head"><span>{day.day}</span><span>{day.revenue ? `${day.revenue.toLocaleString('ru-RU')} ₽` : 'нет данных'}</span></div>
          <div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.max((day.revenue / max) * 100, day.revenue ? 8 : 0)}%` }} /></div>
          {day.checks > 0 && <div className="small">{day.checks} чеков • ср. чек {day.avgCheck.toLocaleString('ru-RU')} ₽</div>}
        </div>
      ))}
    </div>
  );
}

function AlertList({ alerts }) {
  return <div className="stack">{alerts.map((alert) => <div className={`card alert ${alert.level}`} key={alert.title}><div className="name">{alert.title}</div><div className="small">{alert.text}</div></div>)}</div>;
}

function NetworkPanel({ summary }) {
  const { restaurants, totals, ai } = summary.network;
  return (
    <div className="stack">
      <div className="card intro-card network-hero">
        <div className="badge dark">Сеть ресторанов</div>
        <h3>Один mini app для всех точек</h3>
        <p>В боевой версии каждая точка имеет свой restaurant_id в базе. Владелец видит всю сеть, а управляющие получают доступ только к своим ресторанам.</p>
      </div>
      <div className="grid">
        <MetricCard metric={{ label: 'Выручка сети', value: formatMoney(totals.revenue), delta: `${totals.percent}% плана`, status: totals.percent >= 80 ? 'good' : 'bad' }} />
        <MetricCard metric={{ label: 'Точек', value: String(restaurants.length), delta: `${totals.weakPoints} с риском`, status: totals.weakPoints ? 'bad' : 'good' }} />
        <MetricCard metric={{ label: 'Чеки сети', value: String(totals.checks), delta: 'сумма точек', status: 'good' }} />
        <MetricCard metric={{ label: 'Средний чек сети', value: formatMoney(totals.avgCheck), delta: 'по всем точкам', status: totals.avgCheck >= 1350 ? 'good' : 'bad' }} />
      </div>
      <div className="restaurant-grid">
        {restaurants.map((item) => {
          const percent = Math.round((item.revenue / item.plan) * 100);
          return (
            <div className={`card restaurant-card ${item.status}`} key={item.id}>
              <div className="restaurant-head"><div><div className="name">{item.name}</div><div className="small">{item.city} • {item.checks} чеков</div></div><div className={`status-badge ${item.status}`}>{percent}%</div></div>
              <div className="metric-value">{formatMoney(item.revenue)}</div>
              <div className="progress-bg"><div className="progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} /></div>
              <div className="small">Проблема: {item.problem} • ср. чек {formatMoney(item.avgCheck)}</div>
            </div>
          );
        })}
      </div>
      <div className="card ai-card"><h3>AI-вывод по сети</h3><p>{ai}</p></div>
      <div className="notice-box">Внедрение сети: в Supabase создаются таблицы restaurants, users, user_restaurants, daily_sales, orders. Mini app фильтрует данные по роли пользователя.</div>
    </div>
  );
}

function LossesPanel({ summary }) {
  return (
    <div className="stack">
      <div className="card intro-card loss-total">
        <div className="metric-label">Риски и отклонения</div>
        <h3>Финансовые отклонения под контролем: {formatMoney(summary.totalLoss)}</h3>
        <p>Это не гарантия, а управленческая оценка: какие отклонения требуют внимания и какие действия быстрее всего дадут эффект.</p>
      </div>
      {summary.moneyLosses.map((item, index) => (
        <div className={`card loss-card ${item.level}`} key={item.title}>
          <div className="loss-head"><div className="problem-index">{index + 1}</div><div><div className="name">{item.title}</div><div className="small">{item.reason}</div></div><div className="loss-money">{formatMoney(item.amount)}</div></div>
          <div className="action-list"><b>Что сделать:</b> {item.action}</div>
        </div>
      ))}
      <div className="notice-box">Этот экран показывает владельцу не только цифры, а конкретные отклонения, приоритеты и действия на смену.</div>
    </div>
  );
}

function ActionPlanPanel({ summary }) {
  const [copied, setCopied] = useState(false);
  async function copyScript() {
    try {
      await navigator.clipboard.writeText(summary.teamScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="stack">
      <div className="card intro-card">
        <div className="badge dark">AI-план дня</div>
        <h3>Что сделать сегодня</h3>
        <p>AI превращает цифры в задачи для владельца, управляющего, шефа и маркетинга.</p>
      </div>
      {summary.actionPlan.map((item) => (
        <div className="card action-card" key={item.role}>
          <div className="role-pill">{item.role}</div>
          <div className="name">{item.title}</div>
          <div className="small">{item.text}</div>
        </div>
      ))}
      <div className="card script-card">
        <div className="metric-label">Скрипт для команды</div>
        <p>{summary.teamScript}</p>
        <button className="primary" onClick={copyScript}>{copied ? 'Скопировано' : 'Скопировать скрипт'}</button>
      </div>
    </div>
  );
}

function ForecastPanel({ summary }) {
  const f = summary.forecast;
  const percent = Math.round((f.projected / f.plan) * 100);
  return (
    <div className="stack">
      <div className="card forecast-card">
        <div className="metric-label">Прогноз конца дня</div>
        <h3>{formatMoney(f.projected)} из {formatMoney(f.plan)}</h3>
        <div className="progress-bg"><div className="progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} /></div>
        <div className="forecast-row"><span>{f.risk}</span><span>Уверенность {f.confidence}%</span></div>
      </div>
      <div className="grid">
        <MetricCard metric={{ label: 'Сейчас', value: formatMoney(f.current), delta: 'факт', status: 'good' }} />
        <MetricCard metric={{ label: 'Прогноз', value: formatMoney(f.projected), delta: `${percent}% плана`, status: percent >= 100 ? 'good' : 'bad' }} />
      </div>
      <div className="card"><div className="name">Что сделать до конца дня</div>{f.recommendations.map((item) => <div className="check-line" key={item}>✓ {item}</div>)}</div>
    </div>
  );
}

function ShiftsPanel({ summary }) {
  return (
    <div className="stack">
      <div className="card intro-card"><div className="metric-label">Смены</div><h3>Где день ломается по часам</h3><p>Можно отдельно смотреть утро, день и вечер: выручка, чек, проблема, действие.</p></div>
      {summary.shifts.map((shift) => (
        <div className={`card shift-card ${shift.status}`} key={shift.name}>
          <div className="shift-head"><div><div className="name">{shift.name}</div><div className="small">{shift.time}</div></div><div className={`status-badge ${shift.status}`}>{shift.status === 'good' ? 'норма' : shift.status === 'bad' ? 'риск' : 'внимание'}</div></div>
          <div className="grid shift-grid"><MetricCard metric={{ label: 'Выручка', value: formatMoney(shift.revenue), delta: 'смена', status: 'good' }} /><MetricCard metric={{ label: 'Ср. чек', value: formatMoney(shift.avgCheck), delta: shift.avgCheck < 1450 ? 'ниже цели' : 'норма', status: shift.avgCheck < 1450 ? 'bad' : 'good' }} /></div>
          <div className="small">AI: {shift.issue}</div>
        </div>
      ))}
    </div>
  );
}

function KpiPanel({ summary }) {
  return (
    <div className="stack">
      <div className="section-title"><h2>KPI ресторана</h2></div>
      {summary.kpiSettings.map((item) => (
        <div className="card setting-card" key={item.name}><div><div className="name">{item.name}</div><div className="small">Статус: {item.status}</div></div><div className="money">{item.value}</div></div>
      ))}
    </div>
  );
}

function ProblemCenter({ summary }) {
  return (
    <div className="stack">
      <div className="card intro-card"><div className="badge dark">Центр контроля</div><h3>Что требует внимания сегодня</h3><p>Не просто цифры, а конкретные отклонения, причины и действия.</p></div>
      {summary.problems.map((problem, index) => (
        <div className={`card problem-card ${problem.level}`} key={problem.title}>
          <div className="problem-head"><div className="problem-index">{index + 1}</div><div><div className="name">{problem.title}</div><div className="small">{problem.reason}</div></div><div className={`impact ${problem.level}`}>{problem.impact}</div></div>
          <div className="action-list">{problem.actions.map((action) => <div key={action}>• {action}</div>)}</div>
        </div>
      ))}
    </div>
  );
}

function TeamPanel({ summary }) {
  const avgTeamCheck = Math.round(summary.waiters.reduce((sum, item) => sum + item.rawAvgCheck, 0) / summary.waiters.length);
  return (
    <div className="stack">
      <div className="card intro-card"><div className="metric-label">Команда</div><h3>Официанты и средний чек</h3><p>Командный средний чек: <b>{formatMoney(avgTeamCheck)}</b>. Система подсвечивает, кто ниже нормы и где нужна работа с допродажами.</p></div>
      {summary.waiters.map((waiter) => {
        const diff = Math.round(((waiter.rawAvgCheck - avgTeamCheck) / avgTeamCheck) * 100);
        const weak = diff < -10;
        return <div className={`card waiter-card ${weak ? 'bad' : 'good'}`} key={waiter.name}><div className="waiter-main"><div><div className="name">{waiter.name}</div><div className="small">{waiter.checks} чеков • выручка {waiter.revenue} • {waiter.status}</div></div><div className="waiter-score"><strong>{waiter.avgCheck}</strong><span>{diff > 0 ? '+' : ''}{diff}% к команде</span></div></div><div className="small">{weak ? 'AI: ниже команды. Дать фокус на напитки, десерты и закуски.' : 'AI: хороший уровень. Можно использовать как пример для смены.'}</div></div>;
      })}
    </div>
  );
}

function AiChat({ summary, selectedRestaurantId }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Задай вопрос по ресторану или сети. Например: “где теряем деньги?”, “какая точка слабее?”, “какой прогноз конца дня?”' }]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  async function ask(nextQuestion) {
    const text = String(nextQuestion || question).trim();
    if (!text || sending) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setQuestion('');
    setSending(true);
    try {
      const response = await fetch('/api/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text, restaurant_id: selectedRestaurantId, ai_mode: 'director' }) });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer || 'Нет ответа.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Не получилось получить ответ. Проверь API route и логи Vercel.' }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div className="chat-wrap">
      <div className="card ai-card"><h3>AI-операционный директор</h3><p>{summary.ai.summary}</p></div>
      <div className="quick-grid">{summary.ai.exampleQuestions.map((item) => <button className="quick" key={item} onClick={() => ask(item)}>{item}</button>)}</div>
      <div className="chat-box">{messages.map((message, index) => <div className={`bubble ${message.role}`} key={`${message.role}-${index}`}>{message.text}</div>)}{sending && <div className="bubble assistant">Думаю по цифрам...</div>}</div>
      <div className="ask-row"><textarea ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Спроси: где ресторан теряет деньги?" rows={2} /><button className="primary send" onClick={() => ask()} disabled={sending}>➤</button></div>
    </div>
  );
}

function LiveOrdersDemo() {
  const [orders, setOrders] = useState([]);
  const [running, setRunning] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [scenarioKey, setScenarioKey] = useState('normal');
  const scenario = demoScenarios[scenarioKey];

  function addDemoOrder() {
    setNextId((currentId) => {
      const order = createDemoOrder(currentId, scenarioKey);
      setOrders((prev) => [order, ...prev.map((item) => promoteStatus(item))].slice(0, 18));
      return currentId + 1;
    });
  }

  function resetDemo() { setRunning(false); setOrders([]); setNextId(1); }

  useEffect(() => {
    if (!running) return undefined;
    const interval = setInterval(addDemoOrder, scenario.speed);
    return () => clearInterval(interval);
  }, [running, scenarioKey]);

  const demoRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const activeOrders = orders.filter((order) => order.status !== 'выдан').length;
  const avgCheck = orders.length ? Math.round(demoRevenue / orders.length) : 0;
  const totalDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
  const kitchenQueue = orders.filter((order) => order.status === 'готовится').length;

  return (
    <div className="live-wrap">
      <div className="card live-hero"><div className="live-topline"><span className={`live-dot ${running ? 'on' : ''}`} /><span>{running ? 'Демо-поток заказов идёт' : 'Демо-поток на паузе'}</span></div><h3>Симулятор заказов</h3><p>Выбери сценарий и нажми «Старт». Можно показать клиенту, как меняются заказы, выручка, кухня, скидки и сигналы.</p><div className="scenario-grid">{Object.entries(demoScenarios).map(([key, item]) => <button className={`scenario ${scenarioKey === key ? 'active' : ''}`} key={key} onClick={() => setScenarioKey(key)}><strong>{item.name}</strong><span>{item.description}</span></button>)}</div><div className="control-row"><button className="primary" onClick={() => setRunning((value) => !value)}>{running ? 'Пауза' : 'Старт'}</button><button className="secondary" onClick={addDemoOrder}>+ Заказ</button><button className="secondary" onClick={resetDemo}>Сброс</button></div></div>
      <div className="grid"><MetricCard metric={{ label: 'Заказы демо', value: String(orders.length), delta: running ? 'live' : 'пауза', status: running ? 'good' : 'neutral' }} /><MetricCard metric={{ label: 'Выручка демо', value: formatMoney(demoRevenue), delta: '+ тест', status: 'good' }} /><MetricCard metric={{ label: 'Средний чек', value: formatMoney(avgCheck), delta: avgCheck && avgCheck < 1200 ? 'ниже цели' : 'считается', status: avgCheck && avgCheck < 1200 ? 'bad' : 'good' }} /><MetricCard metric={{ label: 'Кухня', value: String(kitchenQueue), delta: kitchenQueue > 5 ? 'очередь' : 'норма', status: kitchenQueue > 5 ? 'bad' : 'good' }} /><MetricCard metric={{ label: 'Скидки демо', value: formatMoney(totalDiscount), delta: totalDiscount > 5000 ? 'проверить' : 'норма', status: totalDiscount > 5000 ? 'bad' : 'neutral' }} /><MetricCard metric={{ label: 'В работе', value: String(activeOrders), delta: 'зал/кухня', status: activeOrders > 7 ? 'bad' : 'good' }} /></div>
      <div className={`card alert ${kitchenQueue > 5 || totalDiscount > 5000 || (avgCheck && avgCheck < 1200) ? 'bad' : 'warn'}`}><div className="name">AI-сигнал: {scenario.name}</div><div className="small">{kitchenQueue > 5 ? 'Кухня перегружена: часть заказов зависает. Нужно проверить скорость отдачи и стоп-лист.' : totalDiscount > 5000 ? 'Скидки растут: проверь причины скидок по смене и официантам.' : avgCheck && avgCheck < 1200 ? 'Средний чек ниже цели: не хватает напитков, десертов и допродажи.' : 'Смена выглядит управляемо. Продолжай смотреть средний чек и очередь кухни.'}</div></div>
      <div className="section-title"><h2>Живая лента</h2></div>
      {orders.length === 0 ? <div className="card empty-live">Пока заказов нет. Нажми «Старт» или «+ Заказ».</div> : <div className="orders-list">{orders.map((order) => <div className="card order-card" key={order.id}><div className="order-head"><div><div className="name">Заказ #{order.id} • {order.table}</div><div className="small">{order.time} • официант {order.waiter}</div></div><div className={`status ${order.status}`}>{order.status}</div></div><div className="order-items">{order.items.map((item, index) => <div className="order-item" key={`${order.id}-${item.name}-${index}`}><span>{item.quantity}× {item.name}</span><span>{formatMoney(item.price * item.quantity)}</span></div>)}</div>{order.discount > 0 && <div className="order-item discount-line"><span>Скидка</span><span>-{formatMoney(order.discount)}</span></div>}<div className="order-total"><span>Итого</span><strong>{formatMoney(order.total)}</strong></div></div>)}</div>}
      <div className="notice-box">В реальности события будут приходить из iiko через API, CSV, n8n или Supabase.</div>
    </div>
  );
}


function RestaurantSelector({ summary, value, onChange }) {
  const options = [{ id: 'all', name: 'Вся сеть', city: 'Все точки' }, ...(summary.network?.restaurants || [])];
  return (
    <div className="restaurant-selector card">
      <div>
        <div className="metric-label">Выбранный режим</div>
        <div className="selector-title">{value === 'all' ? 'Вся сеть' : options.find((item) => item.id === value)?.name || 'Ресторан'}</div>
      </div>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((item) => <option value={item.id} key={item.id}>{item.name} {item.city ? `• ${item.city}` : ''}</option>)}
      </select>
    </div>
  );
}

function ManagementPanel({ summary, selectedRestaurantId, onRestaurantChange }) {
  const storageKey = `resto-v72-settings-${selectedRestaurantId}`;
  const defaultSettings = {
    dailyRevenue: summary.plan?.dailyRevenue || 250000,
    avgCheck: summary.plan?.avgCheck || 1450,
    foodcostMax: summary.plan?.foodcostMax || 30,
    discountMax: summary.plan?.discountMax || 9000,
    dailyReportTime: '09:00',
    forecastReportTime: '16:00',
    aiFocus: 'прибыль, средний чек, скидки, фудкост, команда',
    ownerChat: ''
  };
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setSettings(raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings);
    } catch {
      setSettings(defaultSettings);
    }
  }, [selectedRestaurantId]);

  function updateField(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: selectedRestaurantId, settings })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch {
      setSaved(false);
    }
  }

  const aiButtons = [
    'AI-директор: что происходит сегодня?',
    'AI-финансист: где отклонения в деньгах?',
    'AI-оператор: что сделать до вечера?',
    'AI-HR: кто из команды просел?',
    'AI-меню: какие блюда продвигать?',
    'AI-маркетолог: какую акцию запустить без слива маржи?'
  ];

  return (
    <div className="stack">
      <div className="card intro-card manage-hero">
        <div className="badge dark">Управление</div>
        <h3>Настройки ресторана, KPI, AI и уведомлений</h3>
        <p>В демо настройки сохраняются локально в браузере. В боевой версии они пишутся в Supabase и управляют отчётами, тревогами и AI-логикой.</p>
      </div>

      <RestaurantSelector summary={summary} value={selectedRestaurantId} onChange={onRestaurantChange} />

      <div className="section-title"><h2>KPI и нормы</h2></div>
      <div className="settings-grid">
        <label className="input-card card"><span>План выручки</span><input value={settings.dailyRevenue} onChange={(e) => updateField('dailyRevenue', e.target.value)} /></label>
        <label className="input-card card"><span>Цель среднего чека</span><input value={settings.avgCheck} onChange={(e) => updateField('avgCheck', e.target.value)} /></label>
        <label className="input-card card"><span>Норма фудкоста, %</span><input value={settings.foodcostMax} onChange={(e) => updateField('foodcostMax', e.target.value)} /></label>
        <label className="input-card card"><span>Лимит скидок</span><input value={settings.discountMax} onChange={(e) => updateField('discountMax', e.target.value)} /></label>
      </div>

      <div className="section-title"><h2>Уведомления</h2></div>
      <div className="settings-grid">
        <label className="input-card card"><span>Ежедневный отчёт</span><input value={settings.dailyReportTime} onChange={(e) => updateField('dailyReportTime', e.target.value)} /></label>
        <label className="input-card card"><span>Прогноз дня</span><input value={settings.forecastReportTime} onChange={(e) => updateField('forecastReportTime', e.target.value)} /></label>
        <label className="input-card card wide"><span>Telegram chat_id владельца</span><input placeholder="добавим после внедрения" value={settings.ownerChat} onChange={(e) => updateField('ownerChat', e.target.value)} /></label>
      </div>

      <div className="section-title"><h2>AI-режимы</h2></div>
      <div className="ai-mode-grid">
        {aiButtons.map((item) => <button className="quick ai-mode" key={item}>{item}</button>)}
      </div>
      <label className="input-card card wide"><span>Фокус AI-аналитики</span><textarea rows={3} value={settings.aiFocus} onChange={(e) => updateField('aiFocus', e.target.value)} /></label>

      <div className="section-title"><h2>Роли и доступы</h2></div>
      <div className="role-grid">
        {summary.users.map((user) => (
          <div className="card role-card" key={user.role}>
            <div className="name">{user.name}</div>
            <div className="small">{user.access}</div>
            <div className="role-pill">{user.role}</div>
          </div>
        ))}
      </div>

      <button className="primary" onClick={saveSettings}>{saved ? 'Настройки сохранены' : 'Сохранить настройки'}</button>
      <div className="notice-box">Боевой слой: эти настройки пишутся в таблицы kpi_settings, notification_rules, users, user_restaurant_access и используются n8n для отчётов.</div>
    </div>
  );
}

function OwnerReport({ summary }) {
  const [copied, setCopied] = useState(false);
  const revenue = summary.metrics.find((m) => m.key === 'revenue');
  const checks = summary.metrics.find((m) => m.key === 'checks');
  const avgCheck = summary.metrics.find((m) => m.key === 'avgCheck');
  const foodcost = summary.metrics.find((m) => m.key === 'foodcost');
  const discounts = summary.metrics.find((m) => m.key === 'discounts');
  const plan = summary.plan?.dailyRevenue || 250000;
  const percent = Math.round(((revenue?.raw || 0) / plan) * 100);
  const report = `Отчёт по ресторану за сегодня\n\nВыручка: ${revenue.value} (${revenue.delta})\nПлан: ${formatMoney(plan)}, выполнено ${percent}%\nЧеки: ${checks.value}\nСредний чек: ${avgCheck.value} (${avgCheck.delta})\nФудкост: ${foodcost.value}\nСкидки: ${discounts.value}\nФинансовые отклонения: ${formatMoney(summary.totalLoss)}\n\nГлавные проблемы:\n1. Средний чек ниже цели.\n2. Фудкост выше нормы.\n3. Скидки требуют проверки.\n\nЧто сделать:\n1. Дать официантам скрипт: напиток + десерт к каждому второму чеку.\n2. Проверить скидки по сменам и сотрудникам.\n3. Сверить себестоимость топовых блюд и списания.\n4. Проверить прогноз конца дня и точку сети с худшим план-фактом.\n\nAI-вывод: выручка растёт, но часть прибыли теряется в среднем чеке, скидках и фудкосте.`;
  async function copyReport() { try { await navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } }
  return <div className="stack"><div className="card intro-card"><div className="metric-label">Отчёт владельцу</div><h3>Готовый текст для Telegram</h3><p>Владелец получает не таблицу, а готовый вывод, риски, прогноз и действия.</p></div><div className="card report-card"><pre>{report}</pre></div><button className="primary" onClick={copyReport}>{copied ? 'Скопировано' : 'Скопировать отчёт'}</button><div className="notice-box">Позже отчёт можно автоматически отправлять владельцу каждое утро через Telegram Bot API.</div></div>;
}

function NotificationPanel({ notifications }) {
  return <div className="stack">{notifications.map((item) => <div className="card setting-card" key={item.id}><div><div className="name">{item.title}</div><div className="small">Время: {item.time}</div><div className="small">AI-инструкция: {item.prompt}</div></div><div className={`pill ${item.enabled ? 'on' : 'off'}`}>{item.enabled ? 'вкл' : 'выкл'}</div></div>)}<div className="notice-box">В боевой версии уведомления запускаются через n8n или backend cron и отправляются через Telegram Bot API.</div></div>;
}

function AccessPanel({ users, dataSources, summary }) {
  return <div className="stack"><KpiPanel summary={summary} /><div className="section-title"><h2>Пользователи и роли</h2></div>{users.map((user) => <div className="card setting-card" key={user.name}><div><div className="name">{user.name}</div><div className="small">Роль: {user.role}</div><div className="small">Доступ: {user.access}</div></div></div>)}<div className="section-title"><h2>Источники данных</h2></div>{dataSources.map((source) => <div className="card setting-card" key={source.name}><div><div className="name">{source.name}</div><div className="small">Статус: {source.status}</div><div className="small">{source.hint}</div></div></div>)}<div className="notice-box">Для сети нужен слой доступа: владелец видит все точки, управляющий — только свою, шеф — кухню и блюда.</div></div>;
}


function DataImportPanel({ summary, selectedRestaurantId }) {
  const [fileName, setFileName] = useState('iiko_olap_sales_30_days.csv');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function buildPreview() {
    setLoadingPreview(true);
    try {
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: selectedRestaurantId, filename: fileName })
      });
      const data = await response.json();
      setPreview(data);
    } catch {
      setPreview({ ok: false, message: 'Не удалось сделать preview. Проверь /api/import/preview в Vercel.' });
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div className="stack">
      <div className="card intro-card v7-hero">
        <div className="badge dark">v7.3 Real Data Test</div>
        <h3>Импорт выгрузки iiko / CSV</h3>
        <p>Первый боевой шаг: берём выгрузку за 7–30 дней, загружаем её в Supabase и показываем AI-анализ уже по фактическим данным ресторана.</p>
      </div>
      <div className="card input-card wide">
        <span>Название файла для демо-preview</span>
        <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="iiko_olap_sales_30_days.csv" />
        <button className="primary" onClick={buildPreview} disabled={loadingPreview}>{loadingPreview ? 'Готовлю preview...' : 'Сделать preview импорта'}</button>
      </div>
      <div className="v7-flow">
        {['CSV/Excel из iiko', 'Нормализация колонок', 'Supabase upsert', 'AI-анализ', 'Telegram-отчёт'].map((item, index) => <div className="card v7-step" key={item}><b>{index + 1}</b><span>{item}</span></div>)}
      </div>
      {preview && <div className={`card ${preview.ok ? 'ai-card' : 'alert bad'}`}><div className="name">Preview импорта</div><div className="small">{preview.message}</div>{preview.fields && <div className="v7-tags">{preview.fields.map((field) => <span key={field}>{field}</span>)}</div>}</div>}
      <div className="notice-box">В v7.3 /api/summary уже умеет собирать real data из Supabase: daily_sales, dish_sales и waiter_sales. Для теста загрузи CSV из docs/demo-data.</div>
    </div>
  );
}

function AuditPanel({ summary }) {
  const weakWaiter = [...(summary.waiters || [])].sort((a, b) => a.rawAvgCheck - b.rawAvgCheck)[0];
  const weakDish = summary.lowDishes?.[0];
  const weakPoint = [...(summary.network?.restaurants || [])].sort((a, b) => (a.revenue / a.plan) - (b.revenue / b.plan))[0];
  const planPercent = summary.network?.totals?.percent || 0;
  const auditCards = [
    { title: 'Финансы', value: formatMoney(summary.totalLoss), text: 'Оценка отклонений: средний чек, фудкост, скидки и кухня.', level: 'warn' },
    { title: 'Слабая точка', value: weakPoint?.name || 'нет данных', text: weakPoint ? `Проблема: ${weakPoint.problem}. Выполнение плана ниже сети.` : 'Добавь данные сети.', level: 'warn' },
    { title: 'Команда', value: weakWaiter?.name || 'нет данных', text: weakWaiter ? `Средний чек ${weakWaiter.avgCheck}. Нужен скрипт допродаж.` : 'Нет данных по официантам.', level: 'warn' },
    { title: 'Меню', value: weakDish?.name || 'нет данных', text: weakDish ? `Проблема: ${weakDish.issue}.` : 'Нет данных по блюдам.', level: 'warn' }
  ];

  return (
    <div className="stack">
      <div className="card intro-card audit-hero">
        <div className="badge dark">AI-анализ 30 дней</div>
        <h3>Что показать владельцу после выгрузки</h3>
        <p>v7.3 превращает выгрузку за 30 дней в короткий анализ: план-факт, команда, меню, риски и действия на ближайшие 7 дней.</p>
      </div>
      <div className="grid">
        {auditCards.map((card) => <div className={`card audit-card ${card.level}`} key={card.title}><div className="metric-label">{card.title}</div><div className="metric-value">{card.value}</div><div className="small">{card.text}</div></div>)}
      </div>
      <div className="card ai-card">
        <h3>AI-вывод для собственника</h3>
        <p>Сеть выполняет примерно {planPercent}% плана. Быстрее всего деньги можно вернуть через средний чек, контроль скидок и фокус на слабой точке. Первые 7 дней: скрипт официантам, разбор фудкоста топ-блюд, ежедневный прогноз в 16:00 и контроль скидок по сменам.</p>
      </div>
      <div className="card">
        <div className="name">План на 7 дней</div>
        {['День 1: загрузить выгрузку и проверить колонки.', 'День 2: найти 3 главных отклонения в деньгах.', 'День 3: дать скрипт команде и включить отчёт владельцу.', 'День 4–5: проверить эффект по среднему чеку.', 'День 6–7: собрать недельный AI-отчёт и решить, что автоматизировать через n8n.'].map((item) => <div className="check-line" key={item}>✓ {item}</div>)}
      </div>
    </div>
  );
}

function TasksPanel({ summary }) {
  const tasks = [
    { owner: 'Управляющий', title: 'Поднять средний чек', due: 'Сегодня до 18:00', effect: '+12 000–28 000 ₽', status: 'в работе' },
    { owner: 'Шеф-повар', title: 'Проверить фудкост топ-5 блюд', due: 'Сегодня', effect: 'контроль маржи', status: 'новая' },
    { owner: 'Владелец', title: 'Разобрать скидки по сменам', due: 'Завтра 11:00', effect: `контроль ${summary.metrics.find((m) => m.key === 'discounts')?.value || 'скидок'}`, status: 'новая' },
    { owner: 'Маркетинг', title: 'Запустить комбо без слива маржи', due: 'Вечерняя смена', effect: '+десерты и напитки', status: 'план' }
  ];

  return (
    <div className="stack">
      <div className="card intro-card">
        <div className="badge dark">Action Tracker</div>
        <h3>AI-задачи вместо абстрактных советов</h3>
        <p>Каждая рекомендация получает ответственного, срок, статус и ожидаемый эффект.</p>
      </div>
      {tasks.map((task) => <div className="card task-card" key={task.title}><div><div className="role-pill">{task.owner}</div><div className="name">{task.title}</div><div className="small">Срок: {task.due} • эффект: {task.effect}</div></div><div className="pill on">{task.status}</div></div>)}
      <div className="notice-box">В боевой версии задачи можно хранить в Supabase: task_title, owner_role, due_at, status, expected_effect, restaurant_id.</div>
    </div>
  );
}

function PresentationPanel({ summary }) {
  const revenue = summary.metrics.find((m) => m.key === 'revenue');
  const avgCheck = summary.metrics.find((m) => m.key === 'avgCheck');
  const discounts = summary.metrics.find((m) => m.key === 'discounts');
  return (
    <div className="stack presentation-mode">
      <div className="card intro-card presentation-hero">
        <div className="badge dark">Режим презентации</div>
        <h3>AI-отчётность ресторана в Telegram</h3>
        <p>Показывай клиенту выручку, план-факт, команду, меню, риски и действия. Без технического шума.</p>
      </div>
      <div className="grid">
        <MetricCard metric={{ label: 'Выручка', value: revenue?.value || 'нет данных', delta: revenue?.delta || 'факт', status: revenue?.status || 'good' }} />
        <MetricCard metric={{ label: 'Риски', value: formatMoney(summary.totalLoss), delta: 'под контролем', status: 'warn' }} />
        <MetricCard metric={{ label: 'Средний чек', value: avgCheck?.value || 'нет данных', delta: avgCheck?.delta || 'цель', status: avgCheck?.status || 'bad' }} />
        <MetricCard metric={{ label: 'Скидки', value: discounts?.value || 'нет данных', delta: discounts?.delta || 'контроль', status: 'bad' }} />
      </div>
      <div className="card script-card"><div className="metric-label">Готовое действие для команды</div><p>{summary.teamScript}</p></div>
      <div className="card ai-card"><h3>Оффер для клиента</h3><p>Подключаем ресторан к AI-отчётности в Telegram: каждый день владелец видит выручку, план-факт, команду, блюда, прогноз, риски и конкретные действия для команды.</p></div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('today');
  const [summary, setSummary] = useState(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('all');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadSummary(keepLoading = false, restaurantId = selectedRestaurantId) {
    if (keepLoading) setLoading(true);
    const response = await fetch(`/api/summary?restaurant_id=${encodeURIComponent(restaurantId)}`, { cache: 'no-store' });
    const data = await response.json();
    setSummary(data);
    setLoading(false);
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }
    async function load() {
      const initData = tg?.initData || '';
      const authResponse = await fetch('/api/auth', { method: 'POST', headers: initData ? { Authorization: `tma ${initData}` } : {} });
      const auth = await authResponse.json();
      setUser(auth.user || null);
      await loadSummary(false, selectedRestaurantId);
    }
    load().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSummary(false, selectedRestaurantId).catch(() => {});
    const interval = setInterval(() => loadSummary(false, selectedRestaurantId).catch(() => {}), 8000);
    return () => clearInterval(interval);
  }, [selectedRestaurantId]);

  const username = useMemo(() => {
    if (!user) return 'Demo-live';
    return user.first_name || user.username || 'Гость';
  }, [user]);

  if (loading || !summary) return <main className="app"><div className="card">Загружаю отчёт...</div></main>;

  return (
    <main className="app">
      <section className="hero">
        <div className="badge">AI-отчётность v7.3 Real Data Test • {username}</div>
        <h1>{summary.restaurant.name}</h1>
        <p>{summary.period.title}. Demo-live: цифры обновляются автоматически. v7.3: тест реальных данных, импорт CSV/iiko, Supabase-агрегация и AI-анализ.</p>
        <LiveHeader summary={summary} />
      </section>

      <RestaurantSelector summary={summary} value={selectedRestaurantId} onChange={setSelectedRestaurantId} />

      <nav className="tabs">{tabs.map((tab) => <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>

      {activeTab === 'today' && <><PlanFactCard summary={summary} /><div className="grid">{summary.metrics.map((metric) => <MetricCard metric={metric} key={metric.key} />)}</div><div className="section-title"><h2>Сигналы</h2></div><AlertList alerts={summary.alerts} /><div className="section-title"><h2>Топ блюд сегодня</h2></div><RankingTable items={summary.topDishes.slice(0, 3)} /></>}
      {activeTab === 'network' && <NetworkPanel summary={summary} />}
      {activeTab === 'losses' && <LossesPanel summary={summary} />}
      {activeTab === 'actions' && <ActionPlanPanel summary={summary} />}
      {activeTab === 'forecast' && <ForecastPanel summary={summary} />}
      {activeTab === 'shifts' && <ShiftsPanel summary={summary} />}
      {activeTab === 'week' && <><div className="section-title"><h2>Выручка по дням</h2></div><WeekBars days={summary.week} /><div className="section-title"><h2>Официанты</h2></div><RankingTable items={summary.waiters} type="waiters" /></>}
      {activeTab === 'dishes' && <><div className="section-title"><h2>Блюда по выручке</h2></div><RankingTable items={summary.topDishes} /><div className="section-title"><h2>Слабые позиции</h2></div><RankingTable items={summary.lowDishes} /></>}
      {activeTab === 'orders' && <LiveOrdersDemo />}
      {activeTab === 'problems' && <ProblemCenter summary={summary} />}
      {activeTab === 'team' && <TeamPanel summary={summary} />}
      {activeTab === 'chat' && <AiChat summary={summary} selectedRestaurantId={selectedRestaurantId} />}
      {activeTab === 'report' && <OwnerReport summary={summary} />}
      {activeTab === 'notify' && <NotificationPanel notifications={summary.notifications} />}
      {activeTab === 'access' && <AccessPanel users={summary.users} dataSources={summary.dataSources} summary={summary} />}
      {activeTab === 'manage' && <ManagementPanel summary={summary} selectedRestaurantId={selectedRestaurantId} onRestaurantChange={setSelectedRestaurantId} />}
      {activeTab === 'import' && <DataImportPanel summary={summary} selectedRestaurantId={selectedRestaurantId} />}
      {activeTab === 'audit' && <AuditPanel summary={summary} />}
      {activeTab === 'tasks' && <TasksPanel summary={summary} />}
      {activeTab === 'presentation' && <PresentationPanel summary={summary} />}

      <div className="footer-actions"><button className="secondary" onClick={() => loadSummary(false)}>Обновить цифры</button><button className="primary" onClick={() => window.Telegram?.WebApp?.close()}>Закрыть</button></div>
      <div className="notice">MVP v7.3 Real Data Test: тёмный стиль v7.2 сохранён, добавлена проверка реального сценария: CSV/iiko → Supabase → /api/summary → mini app → AI-анализ.</div>
    </main>
  );
}
