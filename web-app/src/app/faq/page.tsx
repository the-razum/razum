import Link from 'next/link'

export const metadata = {
  title: 'FAQ — Razum AI',
  description: 'Ответы на частые вопросы про Razum AI: оплата, майнинг, API, безопасность.',
}

const SECTIONS: Array<{ title: string; items: Array<{ q: string; a: string }> }> = [
  {
    title: 'Общее',
    items: [
      { q: 'Что такое Razum AI?', a: 'Открытая российская AI-платформа с собственным блокчейном. Чат, OpenAI-совместимый API, возможность майнить токены RZM на своём Mac или PC. Работает без VPN из РФ.' },
      { q: 'Чем Razum отличается от ChatGPT?', a: 'Работает без VPN, на русском нативно, принимает рублёвые карты, исходники открыты, можно зарабатывать майнингом. ChatGPT — закрытая система от OpenAI.' },
      { q: 'Это правда децентрализовано?', a: 'Частично. Чейн razum-testnet-1 работает на 1 валидаторе сейчас (запустим multi-validator в следующем релизе). Майнеры — уже независимые, любой может подключить свой компьютер и обрабатывать запросы.' },
      { q: 'Можно ли пользоваться без регистрации?', a: 'Да. Анонимный тариф — 30 запросов в день с одного IP, без email, без карты.' },
    ],
  },
  {
    title: 'Оплата и тарифы',
    items: [
      { q: 'Какие способы оплаты?', a: 'Карты МИР, Visa, Mastercard через Robokassa в рублях. Криптовалюта (USDT, RZM) появится позже.' },
      { q: 'Какие тарифы?', a: 'Бесплатный — 30 запросов/день. Платный — 490₽/мес безлимит. Корпоративный (API для бизнеса) — по запросу.' },
      { q: 'Можно ли получить чек/счёт-фактуру?', a: 'Да, для платных тарифов. Напишите billing@airazum.com с реквизитами вашей организации.' },
      { q: 'Как отменить подписку?', a: 'В личном кабинете → Тариф → Отменить. Будет действовать до конца оплаченного периода, не продлится.' },
      { q: 'Можно ли вернуть деньги?', a: 'Да, в течение 14 дней пропорционально неиспользованной части. Условия — в /terms.' },
    ],
  },
  {
    title: 'Майнинг',
    items: [
      { q: 'Что нужно чтобы майнить?', a: 'Mac с Apple Silicon (M1+, минимум 8 ГБ) или PC с NVIDIA GPU (8+ ГБ VRAM). Стабильный интернет.' },
      { q: 'Как начать?', a: 'Одной командой: curl -L https://airazum.com/install/miner.sh | WALLET=0xYOUR bash. Скрипт сам поставит Ollama, скачает модель, зарегистрирует майнер.' },
      { q: 'Сколько можно заработать?', a: 'На testnet — тестовые токены без реальной стоимости. После mainnet — зависит от количества обработанных задач и общего размера сети. Грубо: Mac mini M4 ~ 80-130 RZM/день.' },
      { q: 'Майнинг нагружает компьютер?', a: 'Да, во время обработки запроса (5-30 секунд). В остальное время — ноль нагрузки. Можно работать параллельно — обычные задачи в браузере / редактор не страдают.' },
      { q: 'Сколько электричества это потребляет?', a: 'Mac: 30-60 Вт (≈ 50-100₽/мес). PC с GPU: 150-350 Вт (250-600₽/мес). Доход от майнинга должен покрывать.' },
      { q: 'Что если у меня нет ETH-кошелька?', a: 'Можно начать без кошелька — токены копятся. Кошелёк (MetaMask) понадобится только когда будете выводить.' },
      { q: 'Майнер может видеть мои файлы?', a: 'Нет. Майнер обрабатывает только текстовые запросы. Доступа к файлам/паролям/фото — никакого.' },
    ],
  },
  {
    title: 'API для разработчиков',
    items: [
      { q: 'Razum совместим с OpenAI SDK?', a: 'Да. Используйте base_url=https://airazum.com/api/v1, api_key=ваш rzm_... ключ. Работает с openai-python, openai-node без правок.' },
      { q: 'Где получить API-ключ?', a: 'Зарегистрируйтесь → /account → Сгенерировать API-ключ. Формат: rzm_<32 символа>.' },
      { q: 'Какие модели доступны?', a: 'qwen3.5-9b (общего назначения, русский), deepseek-r1-7b (reasoning, код). На больших нодах будут крупные модели (Llama-70B и т.п.).' },
      { q: 'Streaming поддерживается?', a: 'Да, через Server-Sent Events. stream=true в запросе.' },
      { q: 'Какие лимиты API?', a: 'Зависят от тарифа. Free 30/день, Pro 1000/день, Enterprise — по соглашению. Бан за DDoS / 429 spam.' },
    ],
  },
  {
    title: 'Безопасность и приватность',
    items: [
      { q: 'Где хранятся мои данные?', a: 'На серверах в РФ. Регистрационные данные — в /opt/razum-web SQLite. Логи запросов — до 90 дней. Подробно в /privacy.' },
      { q: 'Передаёте ли вы данные третьим лицам?', a: 'Нет. Запросы НЕ уходят в OpenAI/Anthropic/Google — обработка на нашей сети майнеров. Передача только: платёжке (для оплат), госорганам (по законному запросу).' },
      { q: 'Можно ли удалить аккаунт?', a: 'Да, в /account. Данные удаляются в течение 30 дней. Транзакционные записи (платежи, обработанные задачи) сохраняются обезличенно.' },
      { q: 'Что если хакеры?', a: 'Пароли в bcrypt, токены HttpOnly + Secure, ECDSA-подписи майнеров, rate-limit на критичных endpoint. Регулярные бэкапы. При утечке — уведомление в течение 24 часов.' },
    ],
  },
  {
    title: 'Технические проблемы',
    items: [
      { q: 'Чат не отвечает', a: 'Проверьте https://airazum.com/api/health. Если "no miners online" — значит все майнеры офлайн (мы работаем над этим). Попробуйте через несколько минут.' },
      { q: 'Получаю 429 Too Many Requests', a: 'Превышен дневной лимит. Регистрируйтесь для повышения лимита или переходите на платный тариф.' },
      { q: 'Майнер не подключается', a: 'Проверьте ~/.razum/miner.err.log. Частые причины: Ollama не запущен (brew services start ollama), часы компьютера сильно сбиты (синхронизируйте NTP), модель не скачана (ollama pull qwen2.5:7b).' },
      { q: 'Получаю странный ответ AI', a: 'Модели могут ошибаться. Это известная проблема LLM. Перефразируйте, добавьте контекст, или переключитесь на другую модель.' },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-4xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='font-bold text-xl'>Razum<span className='text-emerald-400'>AI</span></Link>
          <nav className='flex gap-6 text-sm text-white/70'>
            <Link href='/chat' className='hover:text-white'>Чат</Link>
            <Link href='/docs' className='hover:text-white'>Docs</Link>
            <Link href='/faq' className='text-white'>FAQ</Link>
          </nav>
        </div>
      </header>
      <section className='max-w-3xl mx-auto px-6 py-12'>
        <h1 className='text-4xl font-bold mb-2'>Частые вопросы</h1>
        <p className='text-white/60 mb-10'>Если ответа здесь нет — напишите <a href='mailto:support@airazum.com' className='text-emerald-300 underline'>support@airazum.com</a> или в <a href='https://t.me/razum_ai' className='text-emerald-300 underline'>Telegram</a>.</p>

        {SECTIONS.map(sec => (
          <div key={sec.title} className='mb-10'>
            <h2 className='text-2xl font-semibold mb-4'>{sec.title}</h2>
            <div className='space-y-3'>
              {sec.items.map(item => (
                <details key={item.q} className='group rounded-xl border border-white/10 bg-white/5 overflow-hidden'>
                  <summary className='px-5 py-4 cursor-pointer font-medium hover:bg-white/5 list-none flex items-center justify-between'>
                    {item.q}
                    <svg className='w-4 h-4 text-white/40 group-open:rotate-180 transition' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                    </svg>
                  </summary>
                  <div className='px-5 pb-4 text-white/70 text-sm leading-relaxed'>{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
