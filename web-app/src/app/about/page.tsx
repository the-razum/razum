import Link from 'next/link'

export const metadata = {
  title: 'О проекте — Razum AI',
  description: 'Кто стоит за Razum AI, миссия, ценности, контакты.',
}

export default function AboutPage() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-4xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='font-bold text-xl'>Razum<span className='text-emerald-400'>AI</span></Link>
          <nav className='flex gap-6 text-sm text-white/70'>
            <Link href='/chat' className='hover:text-white'>Чат</Link>
            <Link href='/docs' className='hover:text-white'>Docs</Link>
            <Link href='/about' className='text-white'>О нас</Link>
          </nav>
        </div>
      </header>
      <section className='max-w-3xl mx-auto px-6 py-12'>
        <h1 className='text-4xl font-bold mb-4'>О проекте</h1>
        <p className='text-white/70 text-lg leading-relaxed mb-8'>
          Razum AI — открытая российская платформа для AI-инференса. Мы строим инфраструктуру где
          доступ к нейросетям не зависит от одной компании, не требует VPN, и где каждый владелец
          компьютера может стать частью сети.
        </p>

        <h2 className='text-2xl font-semibold mt-12 mb-4'>Миссия</h2>
        <p className='text-white/70 leading-relaxed mb-4'>
          AI должен быть доступным всем — без блокировок по геопозиции, без зависимости от платёжных
          систем, которые могут отказать. Мы делаем так, чтобы российский разработчик и обычный
          пользователь имели тот же опыт работы с ИИ, что и пользователь в США или Европе.
        </p>

        <h2 className='text-2xl font-semibold mt-12 mb-4'>Ценности</h2>
        <ul className='space-y-3 text-white/80'>
          <li><strong className='text-white'>Открытость.</strong> Весь код на GitHub. Никаких чёрных ящиков и закрытых алгоритмов.</li>
          <li><strong className='text-white'>Прозрачность.</strong> Status сети, метрики, токеномика — всё публично. Нет скрытых комиссий.</li>
          <li><strong className='text-white'>Децентрализация.</strong> Один человек или компания не должны контролировать всё. Майнеры, валидаторы — независимы.</li>
          <li><strong className='text-white'>Уважение приватности.</strong> Запросы не уходят в OpenAI, не продаются рекламодателям. Хранение в РФ.</li>
          <li><strong className='text-white'>Честность.</strong> Public beta — это public beta. Не обещаем mainnet «через месяц» если знаем что нужно 6.</li>
        </ul>

        <h2 className='text-2xl font-semibold mt-12 mb-4'>Команда</h2>
        <p className='text-white/60 italic mb-6'>
          Сейчас проект ведёт небольшая команда. Подробные био добавим, когда стабилизируем структуру.
        </p>
        <div className='grid md:grid-cols-2 gap-4'>
          <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300 font-bold text-xl'>S</div>
              <div>
                <div className='font-semibold'>Sviatoslav</div>
                <div className='text-xs text-white/50'>Founder · разработка</div>
              </div>
            </div>
            <p className='text-sm text-white/70'>Архитектура, чейн, web-app, инфра.</p>
          </div>
          <div className='rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-5 flex items-center justify-center'>
            <Link href='mailto:dev@airazum.com' className='text-emerald-300 text-sm hover:underline'>+ Хотим присоединиться? Пишите</Link>
          </div>
        </div>

        <h2 className='text-2xl font-semibold mt-12 mb-4'>Контакты</h2>
        <div className='space-y-2 text-sm'>
          <div><span className='text-white/50'>Поддержка:</span> <a href='mailto:support@airazum.com' className='text-emerald-300 hover:underline'>support@airazum.com</a></div>
          <div><span className='text-white/50'>Разработка / партнёрство:</span> <a href='mailto:dev@airazum.com' className='text-emerald-300 hover:underline'>dev@airazum.com</a></div>
          <div><span className='text-white/50'>Privacy:</span> <a href='mailto:privacy@airazum.com' className='text-emerald-300 hover:underline'>privacy@airazum.com</a></div>
          <div><span className='text-white/50'>Billing для юр.лиц:</span> <a href='mailto:billing@airazum.com' className='text-emerald-300 hover:underline'>billing@airazum.com</a></div>
          <div><span className='text-white/50'>GitHub:</span> <a href='https://github.com/the-razum' target='_blank' className='text-emerald-300 hover:underline'>@the-razum</a></div>
          <div><span className='text-white/50'>Telegram:</span> <a href='https://t.me/razum_ai' target='_blank' className='text-emerald-300 hover:underline'>@razum_ai</a></div>
        </div>
      </section>
    </div>
  )
}
