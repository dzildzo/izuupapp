# 🚀 TITAN CORE: ULTIMATE - Vercel Deployment Guide

## ✅ Ready for Vercel!

Ваше приложение полностью готово для деплоя на **Vercel** с серверless API.

---

## 📁 Структура проекта для Vercel

```
/workspace/
├── public/
│   └── index.html          # Frontend (Telegram Mini App)
├── api/
│   └── index.js            # Serverless API (Next.js functions)
├── vercel.json             # Vercel конфигурация
├── package.json
└── README.md
```

---

## 🔥 Быстрый старт (3 шага)

### Шаг 1: Установите Vercel CLI
```bash
npm install -g vercel
```

### Шаг 2: Залогиньтесь в Vercel
```bash
vercel login
```

### Шаг 3: Задеплойте!
```bash
cd /workspace
vercel --prod
```

---

## 🛠️ Локальная разработка

```bash
# Запуск локального сервера Vercel
vercel dev

# Приложение будет доступно по адресу:
# http://localhost:3000
# API endpoints: http://localhost:3000/api/*
```

---

## 🌐 Деплой через GitHub (рекомендуется)

1. **Создайте репозиторий на GitHub:**
   ```bash
   git init
   git add .
   git commit -m "TITAN CORE: Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/titan-core.git
   git push -u origin main
   ```

2. **Подключите к Vercel:**
   - Зайдите на [vercel.com](https://vercel.com)
   - Нажмите "Add New Project"
   - Импортируйте ваш GitHub репозиторий
   - Нажмите "Deploy"

3. **Готово!** Ваш сайт будет доступен по адресу:
   ```
   https://titan-core.vercel.app
   ```

---

## 🔗 Интеграция с Telegram

После деплоя:

1. Откройте [@BotFather](https://t.me/BotFather)
2. Создайте нового бота или выберите существующего
3. Используйте команду `/newapp`
4. Укажите URL вашего приложения: `https://titan-core.vercel.app`
5. BotFather даст вам ссылку на Mini App

---

## 💰 Монетизация

Приложение уже включает:
- ✅ 100 welcome credits для новых пользователей
- ✅ Daily rewards с increasing streak bonus
- ✅ Level system с XP progression
- ✅ 15 AI моделей с разной стоимостью
- ✅ Payment webhook для микроплатежей ($4.99-$19.99)

### Для подключения реальных платежей:

1. **Telegram Stars** (рекомендуется):
   ```javascript
   // В production замените mock payment на:
   tg.openInvoice(invoiceUrl); // Telegram Stars invoice
   ```

2. **Stripe/PayPal**:
   - Интегрируйте Stripe Checkout в `/api/payment-webhook`
   - Обновите `paymentWebhook()` функцию в `api/index.js`

---

## 🔧 Настройка базы данных (Production)

По умолчанию используется in-memory storage (Map). Для production:

### Вариант 1: Vercel KV (Redis)
```bash
vercel kv add
```

Обновите `api/index.js`:
```javascript
import { kv } from '@vercel/kv';

// Вместо Map используйте:
await kv.set(`user:${userId}`, JSON.stringify(userData));
await kv.get(`user:${userId}`);
```

### Вариант 2: Supabase/PlanetScale
```javascript
// Добавьте connection string в Vercel Environment Variables
// DATABASE_URL=your_connection_string
```

---

## 📊 Environment Variables (опционально)

Добавьте в Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=your_database_url
STRIPE_SECRET_KEY=sk_test_...
TELEGRAM_BOT_TOKEN=your_bot_token
```

---

## 🎯 Проверка работы

После деплоя проверьте:

1. **Frontend:** Откройте `https://your-app.vercel.app`
2. **API:** 
   - `GET https://your-app.vercel.app/api/get-user?id=test123`
   - `POST https://your-app.vercel.app/api/daily-reward`
3. **Telegram:** Откройте Mini App через бота

---

## ⚡ Оптимизация производительности

- ✅ Статический frontend раздается через Vercel Edge Network
- ✅ API функции автоматически масштабируются
- ✅ CORS настроен для Telegram WebApp
- ✅ Auto-detect API URL (localhost vs production)

---

## 🆘 Troubleshooting

### Ошибка "Function not found"
- Убедитесь что `api/index.js` существует
- Проверьте `vercel.json` routes configuration

### Ошибка CORS в Telegram
- Проверьте headers в `vercel.json`
- Убедитесь что API_URL правильно определяется

### Данные не сохраняются
- В production подключите реальную БД (Vercel KV, Supabase)
- In-memory storage очищается при redeploy

---

## 📈 Масштабирование

Для высоких нагрузок:

1. **Vercel Pro Plan** - больше serverless function executions
2. **Vercel KV** - Redis для сессий и кэша
3. **Upstash** - rate limiting и очереди
4. **Cloudflare R2** - хранение AI результатов

---

## 🎉 Готово!

Ваше приложение **TITAN CORE: ULTIMATE** теперь работает на Vercel!

- Frontend: Cyberpunk AI Platform
- Backend: Serverless API
- Monetization: Credits + Daily Rewards + Payments
- Ready for Telegram Mini Apps

**Start earning now!** 💸
