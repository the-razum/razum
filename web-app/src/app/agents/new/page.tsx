'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TEMPLATES = [
  { label: 'Учитель английского', avatar: '🎓', prompt: 'Ты — преподаватель английского. Отвечай ТОЛЬКО на английском (даже если пишут по-русски). Мягко исправляй ошибки. В конце каждого ответа давай 3 полезные фразы для запоминания.' },
  { label: 'Шеф-повар', avatar: '👨‍🍳', prompt: 'Ты — повар. Помогай придумывать рецепты из того, что есть в холодильнике. Считай БЖУ. Не предлагай острое. Отвечай по-русски, дружелюбно.' },
  { label: 'Юрист по РФ', avatar: '⚖️', prompt: 'Ты — юрист, специализирующийся на законодательстве РФ. Отвечай структурированно: «Закон → Практика → Что делать». Всегда напоминай что это не замена консультации.' },
  { label: 'Code reviewer', avatar: '💻', prompt: 'You are a senior software engineer doing code review. Be direct, concise, point out: bugs, security issues, naming, structure. Don\'t praise, just improve.' },
]

export default function NewAgent() {
  const r = useRouter()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🤖')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function useTemplate(t: typeof TEMPLATES[0]) {
    setName(t.label); setAvatar(t.avatar); setSystemPrompt(t.prompt)
  }

  async function submit() {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, description, systemPrompt, welcomeMessage, isPublic, temperature: 0.7 }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || 'Ошибка'); return }
      r.push('/a/' + j.agent.slug)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally { setBusy(false) }
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-3xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/agents' className='text-sm text-white/70 hover:text-white'>← к галерее</Link>
          <Link href='/' className='font-bold'>Razum<span className='text-emerald-400'>AI</span></Link>
        </div>
      </header>
      <section className='max-w-3xl mx-auto px-6 py-10'>
        <h1 className='text-3xl font-bold mb-2'>Новый агент</h1>
        <p className='text-white/60 mb-8'>Создай AI-ассистента под свою задачу и поделись ссылкой.</p>

        <div className='mb-8'>
          <div className='text-sm text-white/60 mb-2'>Шаблоны (опционально):</div>
          <div className='flex flex-wrap gap-2'>
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => useTemplate(t)}
                className='px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10'>{t.avatar} {t.label}</button>
            ))}
          </div>
        </div>

        <div className='space-y-5'>
          <div>
            <label className='block text-sm text-white/70 mb-1.5'>Имя агента *</label>
            <input value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder='Например, «Шеф-повар Лена»'
              className='w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2.5' />
          </div>
          <div>
            <label className='block text-sm text-white/70 mb-1.5'>Эмодзи-аватар</label>
            <input value={avatar} onChange={e=>setAvatar(e.target.value)} maxLength={10} placeholder='🤖'
              className='w-32 text-center text-2xl bg-black/50 border border-white/15 rounded-lg px-3 py-2.5' />
          </div>
          <div>
            <label className='block text-sm text-white/70 mb-1.5'>Краткое описание</label>
            <input value={description} onChange={e=>setDescription(e.target.value)} maxLength={280} placeholder='Чем агент полезен — одной фразой'
              className='w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2.5' />
          </div>
          <div>
            <label className='block text-sm text-white/70 mb-1.5'>Инструкции (system prompt) *</label>
            <textarea value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)} maxLength={4000} rows={8}
              placeholder='Как агенту вести себя. Например: «Ты — учитель английского. Отвечай только на английском, мягко исправляй ошибки...»'
              className='w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2.5 font-mono text-sm' />
            <div className='text-xs text-white/40 mt-1'>{systemPrompt.length}/4000</div>
          </div>
          <div>
            <label className='block text-sm text-white/70 mb-1.5'>Стартовое сообщение (что агент пишет первым)</label>
            <input value={welcomeMessage} onChange={e=>setWelcomeMessage(e.target.value)} maxLength={500}
              placeholder='Привет! Я помогу с английским. О чём поговорим?'
              className='w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2.5' />
          </div>
          <label className='flex items-center gap-2 text-sm'>
            <input type='checkbox' checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} />
            <span>Публичный (виден в галерее)</span>
          </label>

          <button onClick={submit} disabled={busy || !name || !systemPrompt}
            className='w-full bg-emerald-400 text-black font-semibold py-3 rounded-lg disabled:opacity-40 hover:bg-emerald-300'>
            {busy ? 'Создаю...' : 'Опубликовать'}
          </button>
          {error && <div className='text-red-400 text-sm'>{error}</div>}
        </div>
      </section>
    </div>
  )
}
