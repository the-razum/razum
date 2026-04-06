'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const MODELS = [
  { id: 'deepseek-r1-14b', name: 'DeepSeek R1 14B', desc: 'Умная, рассуждает' },
  { id: 'mistral-7b', name: 'Mistral 7B', desc: 'Быстрая, лёгкая' },
]

type UserInfo = {
  id: string
  name: string
  email: string
  plan: string
  planName: string
  requestsToday: number
  requestsLimit: number
  remaining: number
} | null

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [webSearch, setWebSearch] = useState(true)
  const [searchUsed, setSearchUsed] = useState(false)
  const [user, setUser] = useState<UserInfo>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load user info
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user) setUser(data.user)
    }).catch(() => {})
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model: selectedModel, webSearch }),
      })

      if (res.status === 429) {
        const errData = await res.json()
        setMessages([...newMessages, {
          role: 'assistant',
          content: errData.error + (errData.register
            ? '\n\n[Зарегистрироваться бесплатно →](/register)'
            : errData.upgrade ? '\n\n[Обновить тариф →](/pricing)' : ''),
        }])
        setIsStreaming(false)
        return
      }

      if (!res.ok) throw new Error('API error')

      setSearchUsed(res.headers.get('X-Search-Used') === 'true')
      // Refresh user info after request
      fetch('/api/auth/me').then(r => r.json()).then(data => {
        if (data.user) setUser(data.user)
      }).catch(() => {})

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.replace('data: ', '')
          if (data === '[DONE]') break
          try {
            const json = JSON.parse(data)
            const token = json.choices?.[0]?.delta?.content || ''
            assistantContent += token
            setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
          } catch {}
        }
      }
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Ошибка соединения с сервером. Проверьте что GPU-нода запущена и переменная INFERENCE_URL настроена.',
      }])
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const currentModel = MODELS.find(m => m.id === selectedModel)

  return (
    <div className="h-screen flex bg-bg">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-bold text-lg">Razum AI</span>
            </Link>
          </div>
          <div className="p-3">
            <button
              onClick={() => { setMessages([]); inputRef.current?.focus() }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text2 hover:bg-surface transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Новый чат
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 text-sm text-text2">
            {messages.length > 0 && (
              <div className="p-2 rounded-lg bg-surface text-text text-sm truncate">
                {messages[0].content.slice(0, 40)}...
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border text-xs text-text2">
            {user ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-xs font-bold">{user.name[0]}</span>
                  </div>
                  <span className="text-text truncate">{user.name}</span>
                </div>
                <div className="text-text2 mb-1">
                  {user.planName} · {user.remaining}/{user.requestsLimit} запросов
                </div>
                <div className="w-full bg-surface rounded-full h-1.5 mb-2">
                  <div
                    className="bg-accent rounded-full h-1.5 transition-all"
                    style={{ width: `${Math.max(2, (user.remaining / user.requestsLimit) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => {
                    fetch('/api/auth/me', { method: 'DELETE' }).then(() => {
                      setUser(null)
                      window.location.reload()
                    })
                  }}
                  className="text-text2 hover:text-text transition"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span>Гость · 10 запросов/день</span>
                <a href="/login" className="text-accent hover:underline">Войти</a>
                <a href="/register" className="text-accent hover:underline">Регистрация</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center px-4 gap-3">
          <button onClick={() => setShowSidebar(!showSidebar)} className="text-text2 hover:text-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface border border-border text-sm hover:bg-surface2 transition"
            >
              {currentModel?.name}
              <svg className="w-3 h-3 text-text2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelPicker && (
              <div className="absolute top-10 left-0 bg-surface border border-border rounded-lg shadow-xl z-50 w-64">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModelPicker(false) }}
                    className={`w-full text-left px-4 py-3 hover:bg-surface2 transition first:rounded-t-lg last:rounded-b-lg ${
                      m.id === selectedModel ? 'bg-surface2' : ''
                    }`}
                  >
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-text2">{m.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1" />
          <Link href="/pricing" className="text-sm text-accent hover:underline mr-3">Тарифы</Link>
          {!user && (
            <Link href="/login" className="text-sm px-3 py-1 rounded-lg bg-accent text-bg font-medium hover:bg-accent/90 transition">
              Войти
            </Link>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text2">
              <div className="text-4xl mb-4 opacity-20">R</div>
              <p className="text-lg mb-1">Напишите что-нибудь</p>
              <p className="text-sm">Razum AI ответит, используя {currentModel?.name}</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4">
              {messages.map((msg, i) => (
                <div key={i} className={`mb-6 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-surface2 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%] text-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-accent text-xs font-bold">R</span>
                      </div>
                      <div className={`chat-message text-sm leading-relaxed flex-1 ${
                        isStreaming && i === messages.length - 1 ? 'streaming-cursor' : ''
                      }`}>
                        {msg.content || (isStreaming ? '' : 'Думаю...')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setWebSearch(!webSearch)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition ${
                  webSearch
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-surface border border-border text-text2 hover:bg-surface2'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Поиск в интернете {webSearch ? 'вкл' : 'выкл'}
              </button>
              {searchUsed && (
                <span className="text-xs text-accent/70">Использован поиск</span>
              )}
            </div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите что-нибудь..."
              rows={1}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-accent/50 placeholder-text2"
              style={{ maxHeight: '200px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-bg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/90 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
          <p className="text-center text-xs text-text2 mt-2">
            Razum AI использует open-source модели. Ответы могут быть неточными.
          </p>
        </div>
      </div>
    </div>
  )
}
