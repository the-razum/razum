import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-text2 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Razum AI
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Свободный <span className="text-accent">AI</span>
          </h1>
          <p className="text-text2 text-lg mb-8">
            80% качества ChatGPT за 490 руб. Без VPN. Без цензуры.
            Выбор моделей. Оплата картой МИР и СБП.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/chat"
              className="px-6 py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent/90 transition"
            >
              Начать бесплатно
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 border border-border text-text rounded-lg hover:bg-surface transition"
            >
              Тарифы
            </Link>
          </div>
          <div className="flex gap-8 justify-center mt-12 text-text2 text-sm">
            <div><span className="text-accent font-bold text-xl block">30</span>запросов/день бесплатно</div>
            <div><span className="text-accent font-bold text-xl block">5+</span>моделей на выбор</div>
            <div><span className="text-accent font-bold text-xl block">0.5с</span>первый токен</div>
          </div>
        </div>

        {/* Mining CTA */}
        <div className="mt-20 max-w-3xl mx-auto px-6 w-full">
          <div className="border border-border rounded-xl p-8 bg-surface/50 text-center">
            <h2 className="text-2xl font-bold mb-3">Зарабатывайте с GPU</h2>
            <p className="text-text2 mb-6">
              Подключите свою видеокарту к децентрализованной сети Razum.
              Получайте RZM-токены за обработку AI-запросов.
            </p>
            <div className="flex gap-6 justify-center text-sm text-text2 mb-6">
              <div><span className="text-accent font-bold text-lg block">RTX 3060</span>$2-4/день</div>
              <div><span className="text-accent font-bold text-lg block">RTX 4090</span>$12-18/день</div>
              <div><span className="text-accent font-bold text-lg block">A100</span>$25+/день</div>
            </div>
            <Link
              href="/miner"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Стать майнером
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>Razum AI &copy; 2026</span>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-text transition">Условия</Link>
            <Link href="/privacy" className="hover:text-text transition">Конфиденциальность</Link>
            <Link href="/pricing" className="hover:text-text transition">Тарифы</Link>
            <Link href="/miner" className="hover:text-text transition">Майнерам</Link>
            <a href="https://github.com/the-razum/razum" target="_blank" className="hover:text-text transition">GitHub</a>
            <a href="mailto:support@airazum.com" className="hover:text-text transition">Поддержка</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
