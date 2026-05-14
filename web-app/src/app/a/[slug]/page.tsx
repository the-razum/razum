import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAgentBySlug, incrementAgentUsage } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = getAgentBySlug(params.slug)
  if (!a) return { title: 'Агент не найден' }
  return {
    title: a.name + ' — Razum AI',
    description: a.description || 'AI-агент на платформе Razum AI',
  }
}

export default function AgentChatPage({ params }: { params: { slug: string } }) {
  const a = getAgentBySlug(params.slug)
  if (!a) notFound()
  incrementAgentUsage(a.id)
  // Encode agent config for the chat client
  const cfg = encodeURIComponent(JSON.stringify({
    agentId: a.id, name: a.name, avatar: a.avatar,
    systemPrompt: a.systemPrompt, welcomeMessage: a.welcomeMessage,
    model: a.model,
  }))
  // For MVP — render a simple page with agent info and link to chat with prefilled context
  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-3xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/agents' className='text-sm text-white/70 hover:text-white'>← к галерее</Link>
          <Link href='/' className='font-bold'>Razum<span className='text-emerald-400'>AI</span></Link>
        </div>
      </header>
      <section className='max-w-3xl mx-auto px-6 py-10'>
        <div className='flex items-start gap-4 mb-6'>
          <div className='text-5xl'>{a.avatar}</div>
          <div>
            <h1 className='text-3xl font-bold'>{a.name}</h1>
            <p className='text-white/60 mt-1'>{a.description || 'AI-агент'}</p>
            <div className='text-xs text-white/40 mt-2'>{a.usageCount > 0 ? a.usageCount + ' чатов' : 'новый'}</div>
          </div>
        </div>
        {a.welcomeMessage && (
          <div className='rounded-2xl border border-white/10 bg-white/5 p-4 mb-6'>
            <div className='text-xs text-white/50 mb-1'>{a.name} говорит:</div>
            <div className='text-white/90'>{a.welcomeMessage}</div>
          </div>
        )}
        <Link href={'/chat?agent=' + a.slug} className='block w-full text-center bg-emerald-400 text-black font-semibold py-3 rounded-lg hover:bg-emerald-300'>
          Начать чат
        </Link>
        <p className='text-xs text-white/40 mt-4 text-center'>
          Это публичный агент. Создан пользователем платформы Razum AI.
        </p>
      </section>
    </div>
  )
}
