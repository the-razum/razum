import Link from 'next/link'
import { getPublicAgents } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Агенты — Razum AI', description: 'Каталог пользовательских AI-агентов на Razum AI.',
  openGraph: {
    title: 'Агенты — Razum AI',
    description: 'Каталог пользовательских AI-агентов на Razum AI. Создай своего бота.',
    url: 'https://airazum.com/agents',
    siteName: 'Razum AI',
    locale: 'ru_RU',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Razum AI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Агенты — Razum AI',
    description: 'Каталог пользовательских AI-агентов на Razum AI. Создай своего бота.',
    images: ['/og-image.png'],
  },
}

export default async function AgentsPage() {
  const agents = getPublicAgents(60)
  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='font-bold text-xl'>Razum<span className='text-emerald-400'>AI</span></Link>
          <nav className='flex gap-6 text-sm text-white/70'>
            <Link href='/chat' className='hover:text-white'>Чат</Link>
            <Link href='/agents' className='text-white'>Агенты</Link>
            <Link href='/miner' className='hover:text-white'>Майнинг</Link>
            <Link href='/docs' className='hover:text-white'>Документация</Link>
          </nav>
        </div>
      </header>
      <section className='max-w-5xl mx-auto px-6 py-12'>
        <div className='flex items-end justify-between mb-8 flex-wrap gap-4'>
          <div>
            <h1 className='text-4xl font-bold'>AI-агенты</h1>
            <p className='text-white/60 mt-2'>Готовые ассистенты для конкретных задач. Создан пользователями.</p>
          </div>
          <Link href='/agents/new' className='px-5 py-2.5 bg-emerald-400 text-black font-semibold rounded-lg hover:bg-emerald-300'>+ Создать своего</Link>
        </div>
        {agents.length === 0 ? (
          <div className='rounded-2xl border border-white/10 bg-white/5 p-12 text-center'>
            <div className='text-5xl mb-3'>🤖</div>
            <p className='text-white/70 mb-4'>Пока ни одного публичного агента. Будь первым.</p>
            <Link href='/agents/new' className='inline-block px-5 py-2.5 bg-emerald-400 text-black font-semibold rounded-lg hover:bg-emerald-300'>Создать агента</Link>
          </div>
        ) : (
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {agents.map(a => (
              <Link key={a.id} href={'/a/' + a.slug} className='rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-emerald-400/40 transition'>
                <div className='flex items-start gap-3'>
                  <div className='text-3xl flex-shrink-0'>{a.avatar || '🤖'}</div>
                  <div className='min-w-0 flex-1'>
                    <div className='font-semibold truncate'>{a.name}</div>
                    <div className='text-xs text-white/50 mt-1 line-clamp-2'>{a.description || 'AI-агент'}</div>
                    <div className='text-xs text-white/40 mt-3'>{a.usageCount > 0 ? a.usageCount + ' чатов' : 'новый'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
