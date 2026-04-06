# Razum AI — Запуск веб-сервиса

## Быстрый старт (5 минут)

### 1. Установить зависимости
```bash
cd ~/Downloads/Razum/web-app
npm install
```

### 2. Установить Ollama (бесплатный AI-сервер на твоём Mac)
```bash
# Скачай и установи: https://ollama.com/download
# Или через brew:
brew install ollama

# Запусти:
ollama serve

# В другом терминале — скачай модель (3.8 ГБ):
ollama pull mistral:7b
```

### 3. Настроить переменные
```bash
cp .env.example .env.local
# По умолчанию настроен на Ollama (localhost:11434) — менять ничего не нужно
```

### 4. Запустить
```bash
npm run dev
```

Открой http://localhost:3000 — готово! Чат работает.

---

## Варианты AI-сервера

### Вариант A: Ollama на своём компьютере (бесплатно)
- Подходит для разработки и тестирования
- Модели: mistral:7b (быстрая), llama3:8b, llama3:70b (нужно 40 ГБ RAM)
- URL: `http://localhost:11434/v1`

### Вариант B: Vast.ai — аренда GPU (~$0.20-0.80/час)
1. Зарегистрируйся на https://vast.ai
2. Арендуй машину с RTX 3090 или A100
3. Установи vLLM:
   ```bash
   pip install vllm
   vllm serve meta-llama/Meta-Llama-3-70B-Instruct --port 8000
   ```
4. В `.env.local`:
   ```
   INFERENCE_URL=http://YOUR_VAST_IP:8000/v1
   ```

### Вариант C: Together AI / Groq (быстро, платно)
1. Зарегистрируйся на https://together.ai или https://groq.com
2. Получи API-ключ
3. В `.env.local`:
   ```
   INFERENCE_URL=https://api.together.xyz/v1
   INFERENCE_API_KEY=your-api-key
   MODEL_LLAMA=meta-llama/Llama-3-70b-chat-hf
   ```

---

## Деплой на Vercel (бесплатно)

```bash
npm install -g vercel
vercel
# Следуй инструкциям, установи переменные окружения в дашборде Vercel
```

Или на Netlify:
```bash
npm run build
# Загрузи содержимое .next/standalone на Netlify
```

---

## Структура проекта

```
web-app/
├── src/app/
│   ├── page.tsx          # Главная страница
│   ├── chat/page.tsx     # Чат с AI (стриминг)
│   ├── pricing/page.tsx  # Тарифы
│   ├── api/chat/route.ts # API-прокси к GPU-серверу
│   ├── layout.tsx        # Общий layout
│   └── globals.css       # Стили
├── .env.example          # Шаблон настроек
├── package.json
└── LAUNCH.md             # Эта инструкция
```

## Что дальше

1. Подключить Ollama/vLLM/Together — для реальных ответов
2. Добавить авторизацию (NextAuth.js)
3. Подключить ЮKassa/Stripe для подписок
4. Добавить PostgreSQL для хранения чатов
5. Задеплоить на Vercel/VPS
