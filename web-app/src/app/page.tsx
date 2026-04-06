import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg">
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
    </div>
  )
}
