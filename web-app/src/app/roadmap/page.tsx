import Link from 'next/link'

export const metadata = {
  title: 'Roadmap — Razum AI',
  description: 'Дорожная карта развития Razum AI: что сделано, что в работе, что впереди.',
}

type Status = 'done' | 'in-progress' | 'planned'
const ICON: Record<Status, string> = { done: '✅', 'in-progress': '🟡', planned: '⬜' }

const MILESTONES: Array<{ period: string; items: Array<{ status: Status; text: string }> }> = [
  {
    period: 'Q4 2025',
    items: [
      { status: 'done', text: 'Web-app v0.1 — чат, регистрация, тарифы (код)' },
      { status: 'done', text: 'OpenAI-совместимый API с ECDSA-подписями майнеров' },
      { status: 'done', text: 'Скрытые верификационные таски для проверки майнеров' },
      { status: 'done', text: 'Эпохальная модель наград с halving' },
    ],
  },
  {
    period: 'Q1 2026',
    items: [
      { status: 'done', text: 'Запуск razum-testnet-1 (Cosmos SDK + CometBFT)' },
      { status: 'done', text: 'Public RPC + REST endpoints через airazum.com' },
      { status: 'done', text: 'Faucet 100 RZM/час с лимитами' },
      { status: 'done', text: 'Кастомные AI-агенты (галерея + конструктор)' },
      { status: 'done', text: 'Реферальная программа +30 запросов/день' },
      { status: 'done', text: 'Расширенный block explorer на /chain' },
      { status: 'done', text: 'PWA с офлайн-страницей' },
      { status: 'done', text: 'Светлая тема' },
      { status: 'in-progress', text: 'Resend для email-уведомлений' },
      { status: 'in-progress', text: 'Robokassa — на модерации' },
      { status: 'in-progress', text: 'Off-site бэкапы в Backblaze B2' },
    ],
  },
  {
    period: 'Q2 2026',
    items: [
      { status: 'planned', text: 'Multi-validator чейн (3+ независимых валидатора)' },
      { status: 'planned', text: 'Загрузка файлов в чат (PDF, DOCX, MD)' },
      { status: 'planned', text: 'Голосовой ввод через Whisper' },
      { status: 'planned', text: 'Генерация картинок через FLUX на М-серии' },
      { status: 'planned', text: 'Аналитика по метрикам (Yandex.Metrika)' },
      { status: 'planned', text: 'Telegram-бот для саппорта' },
      { status: 'planned', text: 'Корпоративные тарифы + API для бизнеса' },
    ],
  },
  {
    period: 'Q3 2026',
    items: [
      { status: 'planned', text: 'Auto-agents с расписанием и tool calls' },
      { status: 'planned', text: 'vLLM-узлы для больших моделей (32B+, 70B)' },
      { status: 'planned', text: 'Bridge на Base/Ethereum (RZM ERC-20)' },
      { status: 'planned', text: 'Аудит безопасности x/inference module' },
      { status: 'planned', text: 'Юр.заключение по статусу RZM' },
      { status: 'planned', text: 'Прохождение pen-теста' },
    ],
  },
  {
    period: 'Q4 2026',
    items: [
      { status: 'planned', text: 'Mainnet launch (razum-1)' },
      { status: 'planned', text: 'Public airdrop testnet-юзерам (5% supply)' },
      { status: 'planned', text: 'DEX листинг RZM на Uniswap/PancakeSwap' },
      { status: 'planned', text: 'Партнёрство с 3+ российскими SaaS' },
      { status: 'planned', text: 'Open call для валидаторов' },
    ],
  },
  {
    period: '2027+',
    items: [
      { status: 'planned', text: 'Multi-modal: voice + image + video' },
      { status: 'planned', text: 'On-chain governance (DAO)' },
      { status: 'planned', text: 'Cross-chain interop через IBC' },
      { status: 'planned', text: 'Mobile app native (iOS/Android)' },
    ],
  },
]

export default function RoadmapPage() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-4xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='font-bold text-xl'>Razum<span className='text-emerald-400'>AI</span></Link>
          <nav className='flex gap-6 text-sm text-white/70'>
            <Link href='/chat' className='hover:text-white'>Чат</Link>
            <Link href='/docs' className='hover:text-white'>Docs</Link>
            <Link href='/roadmap' className='text-white'>Roadmap</Link>
          </nav>
        </div>
      </header>
      <section className='max-w-3xl mx-auto px-6 py-12'>
        <h1 className='text-4xl font-bold mb-2'>Roadmap</h1>
        <p className='text-white/60 mb-10'>Куда идёт Razum AI. Обновляется по мере выполнения. Хочешь повлиять? Пиши в <a href='https://t.me/razum_ai' className='text-emerald-300 underline'>Telegram</a>.</p>

        <div className='space-y-10'>
          {MILESTONES.map(m => (
            <div key={m.period}>
              <h2 className='text-xl font-semibold mb-4 text-emerald-300'>{m.period}</h2>
              <ul className='space-y-2'>
                {m.items.map((item, i) => (
                  <li key={i} className='flex items-start gap-3 text-sm'>
                    <span className='flex-shrink-0 mt-0.5'>{ICON[item.status]}</span>
                    <span className={item.status === 'done' ? 'text-white/60 line-through' : 'text-white/90'}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className='text-xs text-white/40 mt-12 pt-6 border-t border-white/10'>
          Last updated: 2026-05-14. Roadmap может корректироваться в зависимости от приоритетов и обратной связи.
        </p>
      </section>
    </div>
  )
}
