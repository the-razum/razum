import Link from 'next/link'

/* ─── SVG icon helpers (inline, no external deps) ─── */
const Icon = ({ d, className = 'w-6 h-6' }: { d: string; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
)

/* ─── JSON-LD Structured Data ─── */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Razum AI',
        url: 'https://airazum.com',
        applicationCategory: 'Artificial Intelligence',
        operatingSystem: 'Web',
        description: 'Децентрализованная AI-платформа с Qwen 3.5 и DeepSeek R1. Без VPN. Оплата картой.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'RUB',
          description: '30 бесплатных запросов в день',
        },
        creator: {
          '@type': 'Organization',
          name: 'Razum AI',
          url: 'https://airazum.com',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Нужен ли VPN для использования Razum AI?',
            acceptedAnswer: { '@type': 'Answer', text: 'Нет. Razum AI работает напрямую из России без VPN.' },
          },
          {
            '@type': 'Question',
            name: 'Какие способы оплаты принимает Razum AI?',
            acceptedAnswer: { '@type': 'Answer', text: 'Карты МИР, Visa, Mastercard через Robokassa.' },
          },
          {
            '@type': 'Question',
            name: 'Можно ли зарабатывать, подключив свой компьютер?',
            acceptedAnswer: { '@type': 'Answer', text: 'Да. Подключите Mac с Apple Silicon или PC с NVIDIA GPU и получайте RZM-токены за обработку AI-запросов.' },
          },
        ],
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/* ─── Reusable Components ─── */
function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-bg/80 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-text font-bold text-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          Razum AI
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-text2">
          <Link href="/pricing" className="hover:text-text transition">Тарифы</Link>
          <Link href="/chain" className="hover:text-text transition">Чейн</Link>
          <Link href="/miner" className="hover:text-text transition">Майнерам</Link>
          <a href="https://t.me/razum_miners" target="_blank" rel="noopener noreferrer" className="hover:text-text transition">Telegram</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-text2 hover:text-text transition hidden sm:block">Войти</Link>
          <Link
            href="/chat"
            className="px-4 py-2 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 transition"
          >
            Попробовать
          </Link>
        </div>
      </div>
    </nav>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-surface/50 hover:bg-surface/80 transition group">
      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent/20 transition">
        <Icon d={icon} />
      </div>
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      <p className="text-text2 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function StepCard({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center text-accent text-xl font-bold mx-auto mb-4">
        {num}
      </div>
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      <p className="text-text2 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function CompareRow({ feature, razum, chatgpt }: { feature: string; razum: string; chatgpt: string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-3 px-4 text-text2 text-sm">{feature}</td>
      <td className="py-3 px-4 text-center text-accent font-medium text-sm">{razum}</td>
      <td className="py-3 px-4 text-center text-text2 text-sm">{chatgpt}</td>
    </tr>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-border rounded-xl overflow-hidden">
      <summary className="cursor-pointer px-6 py-4 flex items-center justify-between text-text font-medium hover:bg-surface/50 transition">
        {q}
        <svg className="w-5 h-5 text-text2 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-6 pb-4 text-text2 text-sm leading-relaxed">{a}</div>
    </details>
  )
}

/* ─── Main Landing Page ─── */
export default function Home() {
  return (
    <>
      <JsonLd />
      <div className="min-h-screen bg-bg text-text">
        <NavBar />

        {/* ═══════ HERO ═══════ */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Ранняя стадия — x10 награды майнерам
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              AI без границ.{' '}
              <span className="text-accent">Без VPN.</span>
            </h1>
            <p className="text-text2 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Мощные AI-модели по цене чашки кофе. Qwen 3.5 и DeepSeek R1 —
              всё работает на децентрализованной сети GPU по всему миру.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/chat"
                className="px-8 py-4 bg-accent text-bg font-bold text-lg rounded-xl hover:bg-accent/90 transition shadow-lg shadow-accent/20"
              >
                Начать бесплатно
              </Link>
              <Link
                href="/miner"
                className="px-8 py-4 border border-border text-text font-semibold text-lg rounded-xl hover:bg-surface transition"
              >
                Стать майнером
              </Link>
            </div>
            {/* Stats */}
            <div className="flex flex-wrap gap-8 sm:gap-16 justify-center mt-16">
              <div>
                <span className="text-accent font-bold text-3xl block">30</span>
                <span className="text-text2 text-sm">запросов/день бесплатно</span>
              </div>
              <div>
                <span className="text-accent font-bold text-3xl block">2</span>
                <span className="text-text2 text-sm">модели AI на выбор</span>
              </div>
              <div>
                <span className="text-accent font-bold text-3xl block">0.5с</span>
                <span className="text-text2 text-sm">до первого токена</span>
              </div>
              <div>
                <span className="text-accent font-bold text-3xl block">490₽</span>
                <span className="text-text2 text-sm">безлимит / месяц</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ WHY RAZUM AI ═══════ */}
        <section className="py-20 px-6" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Почему Razum AI?</h2>
              <p className="text-text2 max-w-xl mx-auto">Всё что нужно от AI — без ограничений и переплат</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                title="Без VPN"
                desc="Работает напрямую из России. Никаких прокси, никаких блокировок. Просто открываете сайт и пользуетесь."
              />
              <FeatureCard
                icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                title="Без цензуры"
                desc="Отвечает на любые вопросы без политкорректных ограничений. Как настоящий ассистент, а не робот-бюрократ."
              />
              <FeatureCard
                icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                title="Оплата МИР и СБП"
                desc="Платите российскими картами. Никаких иностранных подписок и обходных путей."
              />
              <FeatureCard
                icon="M13 10V3L4 14h7v7l9-11h-7z"
                title="Быстрые ответы"
                desc="Первый токен за 0.5 секунды. Децентрализованная сеть GPU распределяет нагрузку — ответ приходит мгновенно."
              />
              <FeatureCard
                icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                title="Поиск в интернете"
                desc="AI ищет актуальную информацию в реальном времени. Не ограничен данными для обучения — знает что происходит сейчас."
              />
              <FeatureCard
                icon="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                title="Несколько AI-моделей"
                desc="Qwen 3.5 для универсальных задач, DeepSeek R1 для логики и рассуждений. Новые модели добавляются регулярно."
              />
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="py-20 px-6 bg-surface/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Как это работает?</h2>
              <p className="text-text2">Децентрализованная сеть — ваши запросы обрабатывают компьютеры участников</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              <StepCard
                num={1}
                title="Вы пишете запрос"
                desc="Задайте вопрос, попросите написать текст, код или проанализировать документ."
              />
              <StepCard
                num={2}
                title="GPU обрабатывает"
                desc="Запрос уходит на ближайший свободный компьютер с мощной видеокартой или Apple Silicon."
              />
              <StepCard
                num={3}
                title="Получаете ответ"
                desc="AI-модель генерирует ответ за секунды. Майнер получает RZM-токены за работу."
              />
            </div>
          </div>
        </section>

        {/* ═══════ COMPARISON TABLE ═══════ */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Razum AI vs ChatGPT</h2>
              <p className="text-text2">Честное сравнение — решайте сами</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface/80 border-b border-border">
                    <th className="py-3 px-4 text-left text-text2 text-sm font-medium">Параметр</th>
                    <th className="py-3 px-4 text-center text-accent text-sm font-bold">Razum AI</th>
                    <th className="py-3 px-4 text-center text-text2 text-sm font-medium">ChatGPT Plus</th>
                  </tr>
                </thead>
                <tbody>
                  <CompareRow feature="Цена" razum="490 ₽/мес" chatgpt="~1 800 ₽/мес" />
                  <CompareRow feature="Работает в России" razum="Да, без VPN" chatgpt="Только через VPN" />
                  <CompareRow feature="Оплата МИР / СБП" razum="✓" chatgpt="✗" />
                  <CompareRow feature="Цензура" razum="Минимальная" chatgpt="Жёсткая" />
                  <CompareRow feature="Поиск в интернете" razum="✓" chatgpt="✓" />
                  <CompareRow feature="Бесплатный план" razum="30 запросов/день" chatgpt="Ограниченный" />
                  <CompareRow feature="Качество ответов" razum="~80% GPT-4" chatgpt="100% GPT-4" />
                  <CompareRow feature="Заработок на GPU" razum="Да, RZM-токены" chatgpt="Нет" />
                </tbody>
              </table>
            </div>
            <p className="text-center text-text2 text-xs mt-4">* Сравнение актуально на апрель 2026</p>
          </div>
        </section>

        {/* ═══════ MINING CTA ═══════ */}
        <section className="py-20 px-6 bg-surface/30" id="mining">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Зарабатывайте на своём компьютере</h2>
              <p className="text-text2 max-w-xl mx-auto">
                Подключите Mac или PC с видеокартой к сети Razum AI. Ваш компьютер обрабатывает AI-запросы — вы получаете RZM-токены.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { device: 'MacBook Air M1', rzm: '25-40', usd: '$1-2' },
                { device: 'Mac Mini M4 Pro', rzm: '80-130', usd: '$4-7' },
                { device: 'RTX 4070', rzm: '130-200', usd: '$7-10' },
                { device: 'RTX 4090', rzm: '250-350', usd: '$12-18' },
              ].map((item) => (
                <div key={item.device} className="p-5 rounded-xl border border-border bg-bg/50 text-center">
                  <div className="text-text font-semibold mb-1">{item.device}</div>
                  <div className="text-accent font-bold text-2xl">{item.rzm}</div>
                  <div className="text-text2 text-xs">RZM/день ≈ {item.usd}</div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link
                href="/miner"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent/10 text-accent border border-accent/30 rounded-xl hover:bg-accent/20 transition font-semibold text-lg"
              >
                <Icon d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                Инструкция за 5 минут
              </Link>
              <p className="text-text2 text-sm mt-4">Ранняя стадия — награды увеличены x10</p>
            </div>
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section className="py-20 px-6" id="faq">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Частые вопросы</h2>
            </div>
            <div className="space-y-3">
              <FaqItem
                q="Нужен ли VPN?"
                a="Нет. Razum AI работает напрямую из России — сервис доступен без VPN, прокси и других обходных путей."
              />
              <FaqItem
                q="Какие модели доступны?"
                a="Qwen 3.5 9B — универсальная модель с отличным русским языком. DeepSeek R1 7B — модель с рассуждениями для логических задач. Мы постоянно добавляем новые модели."
              />
              <FaqItem
                q="Чем отличается от ChatGPT?"
                a="Razum AI стоит 490₽ вместо ~1800₽, работает без VPN из России, принимает оплату картой, не имеет жёсткой цензуры. Качество ответов достаточно для большинства задач."
              />
              <FaqItem
                q="Безопасно ли мои данные?"
                a="Запросы обрабатываются на GPU-нодах без хранения истории на стороне майнера. Ваши чаты шифруются и хранятся только на наших серверах."
              />
              <FaqItem
                q="Можно ли зарабатывать на своём компьютере?"
                a="Да! Подключите Mac с Apple Silicon (M1 и новее) или PC с NVIDIA GPU (RTX 3060+). Установка занимает 5 минут. Токены RZM начисляются за каждый обработанный запрос."
              />
              <FaqItem
                q="Как оплатить подписку?"
                a="Картами МИР, Visa, Mastercard через Robokassa. Всё в рублях, без конвертации."
              />
            </div>
          </div>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="py-20 px-6 bg-surface/30">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Попробуйте прямо сейчас</h2>
            <p className="text-text2 text-lg mb-8">
              30 бесплатных запросов в день. Без регистрации. Без привязки карты.
            </p>
            <Link
              href="/chat"
              className="inline-block px-8 py-4 bg-accent text-bg font-bold text-lg rounded-xl hover:bg-accent/90 transition shadow-lg shadow-accent/20"
            >
              Открыть чат →
            </Link>
          </div>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="border-t border-border py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              <div>
                <div className="flex items-center gap-2 text-text font-bold text-lg mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  Razum AI
                </div>
                <p className="text-text2 text-sm leading-relaxed">
                  Децентрализованная AI-платформа. Свободный доступ к мощным AI-моделям из любой точки мира.
                </p>
              </div>
              <div>
                <h4 className="text-text font-semibold mb-3 text-sm">Продукт</h4>
                <div className="space-y-2">
                  <Link href="/chat" className="block text-text2 text-sm hover:text-text transition">AI-чат</Link>
                  <Link href="/pricing" className="block text-text2 text-sm hover:text-text transition">Тарифы</Link>
                  <Link href="/chain" className="block text-text2 text-sm hover:text-text transition">Чейн (testnet)</Link>
                  <Link href="/miner" className="block text-text2 text-sm hover:text-text transition">Майнерам</Link>
                </div>
              </div>
              <div>
                <h4 className="text-text font-semibold mb-3 text-sm">Информация</h4>
                <div className="space-y-2">
                  <Link href="/terms" className="block text-text2 text-sm hover:text-text transition">Условия</Link>
                  <Link href="/privacy" className="block text-text2 text-sm hover:text-text transition">Конфиденциальность</Link>
                  <a href="https://github.com/the-razum/razum" target="_blank" rel="noopener noreferrer" className="block text-text2 text-sm hover:text-text transition">GitHub</a>
                </div>
              </div>
              <div>
                <h4 className="text-text font-semibold mb-3 text-sm">Связь</h4>
                <div className="space-y-2">
                  <a href="mailto:support@airazum.com" className="block text-text2 text-sm hover:text-text transition">support@airazum.com</a>
                  <a href="https://t.me/razum_miners" target="_blank" rel="noopener noreferrer" className="block text-text2 text-sm hover:text-text transition">Telegram</a>
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text2">
              <span>&copy; 2026 Razum AI. Все права защищены.</span>
              <span>Сделано в России</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
