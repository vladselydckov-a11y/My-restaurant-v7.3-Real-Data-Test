# Resto Mini App v7.3 — Real Data Test

Telegram Mini App для ресторанов и сетей ресторанов: ежедневная AI-отчётность, план-факт, сеть, риски, план действий, прогноз, смены, неделя, заказы, команда, блюда, AI-чат, отчёты, уведомления, доступы, управление KPI, импорт данных, AI-анализ, задачи и демо-режим.

## Что нового в v7.3

v7.3 не меняет визуальную концепцию v7.2 Dark Operator. Главная задача версии — показать механику реального внедрения: выгрузка iiko/Excel/CSV → Supabase → `/api/summary` → mini app → AI-анализ.

Добавлено:

- Реальная агрегация Supabase в `lib/supabaseServer.js`.
- `/api/summary` теперь может считать показатели из таблиц `daily_sales`, `dish_sales`, `waiter_sales`, `kpi_settings`, `restaurants`.
- Вкладка `Импорт` переименована внутри текста в `v7.3 Real Data Test`.
- `/api/import/preview` умеет делать demo-preview и базовый preview по CSV-тексту.
- Добавлена папка `docs/demo-data` с Supabase-ready CSV для выдуманного ресторана `Северный Гриль` за 30 дней.
- Добавлена инструкция `docs/V7_3_REAL_DATA_TEST.md`.

## Что осталось от v7.2

- Тёмный стиль `Dark Operator`: графит, зелёный money-accent, золотой premium accent.
- Все экраны v7.2 сохранены: День, Сеть, Риски, План, Прогноз, Смены, Неделя, Заказы, Контроль, Команда, Блюда, AI-чат, Отчёт, Уведомления, Доступ, Управление, Импорт, AI-анализ, Задачи, Демо.
- Без Supabase приложение работает в demo-live режиме.

## Быстрый деплой на Vercel

1. Создай новый GitHub-репозиторий.
2. Загрузи в него содержимое этой папки: `app`, `lib`, `docs`, `scripts`, `package.json`, `README.md`, `.env.example`.
3. В Vercel создай новый проект.
4. Проверь:
   - Application Preset: `Next.js`
   - Root Directory: `./`
5. Добавь переменную:
   - `BOT_TOKEN=токен_бота`
6. Нажми Deploy.
7. После деплоя вставь Vercel URL в Telegram bot menu button.

## OpenAI

Без ключа AI-чат работает в demo/fallback режиме.

Чтобы включить реальный AI:

```env
OPENAI_API_KEY=твой_openai_key
OPENAI_MODEL=gpt-4.1-mini
```

## Supabase real data mode

По умолчанию v7.3 работает в demo-live режиме.

Чтобы включить реальные данные:

```env
USE_SUPABASE=true
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

Дальше:

1. Открой Supabase SQL Editor.
2. Запусти `docs/SUPABASE_SCHEMA.sql`.
3. Загрузи CSV из `docs/demo-data` в таком порядке:
   - `restaurants.csv`
   - `kpi_settings.csv`
   - `daily_sales.csv`
   - `dish_sales.csv`
   - `waiter_sales.csv`
   - `orders.csv` опционально
4. Сделай Redeploy в Vercel.
5. Открой mini app.

Если всё подключено, `/api/summary` вернёт `dataMode: supabase_real_30_days_v7_3`.

## iiko / Айка

Правильный путь для первого клиента:

1. Показать v7.3 demo.
2. Взять выгрузку iiko за 7–30 дней.
3. Привести колонки к формату Supabase-ready CSV.
4. Загрузить данные в Supabase.
5. Показать план-факт, риски, AI-анализ, прогноз, команду, блюда и задачи.
6. Потом подключать n8n и API, если клиенту нужна ежедневная автоматизация.

Не подключай iiko напрямую во frontend mini app.

## Проверка структуры

```bash
npm run check:structure
```

## Telegram scripts

```bash
BOT_TOKEN=xxx WEBAPP_URL=https://your-app.vercel.app npm run setup:telegram-menu
BOT_TOKEN=xxx WEBAPP_URL=https://your-app.vercel.app CHAT_ID=123 npm run send:open-button
```
