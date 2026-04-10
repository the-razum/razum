'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatInfo = {
  id: string
  title: string
  model: string
  updatedAt: string
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

// --- Markdown renderer ---
function MarkdownContent({ content }: { content: string }) {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null)

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedBlock(idx)
      setTimeout(() => setCopiedBlock(null), 2000)
    })
  }

  const rendered = useMemo(() => {
    if (!content) return []

    const parts: { type: 'text' | 'code'; lang?: string; content: string }[] = []
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'code', lang: match[1] || '', content: match[2].trimEnd() })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) })
    }
    return parts
  }, [content])

  const renderInlineMarkdown = (text: string) => {
    // Process inline formatting
    const elements: (string | JSX.Element)[] = []
    // Split by inline code first
    const codeParts = text.split(/(`[^`]+`)/)
    codeParts.forEach((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        elements.push(
          <code key={i} className="px-1.5 py-0.5 rounded bg-surface2 text-accent text-[0.85em] font-mono">
            {part.slice(1, -1)}
          </code>
        )
      } else {
        // Bold + italic
        let processed = part
          .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
          .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
          .replace(/\*(.+?)\*/g, '<i>$1</i>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:underline" target="_blank" rel="noopener">$1</a>')
        elements.push(
          <span key={i} dangerouslySetInnerHTML={{ __html: processed }} />
        )
      }
    })
    return elements
  }

  const renderTextBlock = (text: string) => {
    const lines = text.split('\n')
    const result: JSX.Element[] = []
    let listItems: string[] = []
    let orderedItems: string[] = []
    let inThink = false
    let thinkContent: string[] = []

    const flushList = () => {
      if (listItems.length > 0) {
        result.push(
          <ul key={`ul-${result.length}`} className="list-disc list-inside space-y-1 my-2 ml-2">
            {listItems.map((item, i) => (
              <li key={i} className="text-text">{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        )
        listItems = []
      }
      if (orderedItems.length > 0) {
        result.push(
          <ol key={`ol-${result.length}`} className="list-decimal list-inside space-y-1 my-2 ml-2">
            {orderedItems.map((item, i) => (
              <li key={i} className="text-text">{renderInlineMarkdown(item)}</li>
            ))}
          </ol>
        )
        orderedItems = []
      }
    }

    const flushThink = () => {
      if (thinkContent.length > 0) {
        result.push(
          <details key={`think-${result.length}`} className="my-2 text-text2">
            <summary className="cursor-pointer text-xs text-text2/60 hover:text-text2 transition select-none">
              Размышления модели
            </summary>
            <div className="mt-1 pl-3 border-l-2 border-border text-xs text-text2/70 whitespace-pre-wrap">
              {thinkContent.join('\n')}
            </div>
          </details>
        )
        thinkContent = []
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Handle <think> tags from DeepSeek
      if (line.trim() === '<think>') {
        flushList()
        inThink = true
        continue
      }
      if (line.trim() === '</think>') {
        inThink = false
        flushThink()
        continue
      }
      if (inThink) {
        thinkContent.push(line)
        continue
      }

      // Headers
      const h3Match = line.match(/^###\s+(.+)/)
      const h2Match = line.match(/^##\s+(.+)/)
      const h1Match = line.match(/^#\s+(.+)/)

      if (h3Match) {
        flushList()
        result.push(<h4 key={`h-${i}`} className="font-semibold text-sm mt-3 mb-1">{renderInlineMarkdown(h3Match[1])}</h4>)
      } else if (h2Match) {
        flushList()
        result.push(<h3 key={`h-${i}`} className="font-semibold mt-4 mb-1">{renderInlineMarkdown(h2Match[1])}</h3>)
      } else if (h1Match) {
        flushList()
        result.push(<h2 key={`h-${i}`} className="font-bold text-lg mt-4 mb-2">{renderInlineMarkdown(h1Match[1])}</h2>)
      }
      // Unordered list
      else if (line.match(/^[\-\*]\s+/)) {
        if (orderedItems.length > 0) flushList()
        listItems.push(line.replace(/^[\-\*]\s+/, ''))
      }
      // Ordered list
      else if (line.match(/^\d+\.\s+/)) {
        if (listItems.length > 0) flushList()
        orderedItems.push(line.replace(/^\d+\.\s+/, ''))
      }
      // Horizontal rule
      else if (line.match(/^---+$/)) {
        flushList()
        result.push(<hr key={`hr-${i}`} className="my-3 border-border" />)
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        flushList()
        result.push(
          <blockquote key={`bq-${i}`} className="border-l-2 border-accent/40 pl-3 my-2 text-text2 italic">
            {renderInlineMarkdown(line.slice(2))}
          </blockquote>
        )
      }
      // Empty line
      else if (line.trim() === '') {
        flushList()
      }
      // Regular paragraph
      else {
        flushList()
        result.push(<p key={`p-${i}`} className="mb-2 last:mb-0">{renderInlineMarkdown(line)}</p>)
      }
    }
    flushList()
    if (inThink) flushThink()
    return result
  }

  let codeBlockIndex = 0

  return (
    <div className="markdown-content">
      {rendered.map((part, i) => {
        if (part.type === 'code') {
          const idx = codeBlockIndex++
          return (
            <div key={i} className="my-3 rounded-lg overflow-hidden border border-border">
              <div className="flex items-center justify-between px-3 py-1.5 bg-surface2 text-xs">
                <span className="text-text2 font-mono">{part.lang || 'code'}</span>
                <button
                  onClick={() => copyCode(part.content, idx)}
                  className="text-text2 hover:text-text transition flex items-center gap-1"
                >
                  {copiedBlock === idx ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Скопировано
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Копировать
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto bg-[#0d1117] text-[#e6edf3] text-xs leading-relaxed font-mono">
                <code>{part.content}</code>
              </pre>
            </div>
          )
        }
        return <div key={i}>{renderTextBlock(part.content)}</div>
      })}
    </div>
  )
}

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
  const [chats, setChats] = useState<ChatInfo[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Load user info
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user) setUser(data.user)
    }).catch(() => {})
  }, [])

  // Load chat history when user is available
  const loadChats = useCallback(() => {
    if (!user) return
    fetch('/api/chats').then(r => r.json()).then(data => {
      if (data.chats) setChats(data.chats)
    }).catch(() => {})
  }, [user])

  useEffect(() => { loadChats() }, [loadChats])

  // Load specific chat messages
  const loadChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`)
      const data = await res.json()
      if (data.messages) {
        const msgs: Message[] = data.messages
          .filter((m: any) => m.role === 'user' || m.role === 'assistant')
          .map((m: any) => ({ role: m.role, content: m.content }))
        setMessages(msgs)
        setCurrentChatId(chatId)
        if (data.chat?.model) {
          const modelExists = MODELS.find(m => m.id === data.chat.model)
          if (modelExists) setSelectedModel(data.chat.model)
        }
      }
    } catch {}
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    inputRef.current?.focus()
  }

  const deleteChat = async (chatId: string) => {
    try {
      await fetch(`/api/chats?id=${chatId}`, { method: 'DELETE' })
      setChats(prev => prev.filter(c => c.id !== chatId))
      if (currentChatId === chatId) startNewChat()
    } catch {}
  }

  // Smart auto-scroll: only scroll if user is near bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120
    setShouldAutoScroll(isNearBottom)
  }, [])

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, shouldAutoScroll])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)
    setShouldAutoScroll(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model: selectedModel,
          webSearch,
          chatId: currentChatId,
        }),
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

      // Track the chat ID from response
      const responseChatId = res.headers.get('X-Chat-Id')
      if (responseChatId && !currentChatId) {
        setCurrentChatId(responseChatId)
      }

      // Refresh user info
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

      // Refresh chat list after message
      loadChats()
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Ошибка соединения с сервером. Проверьте что GPU-нода запущена.',
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

  // Format relative time
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}м`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}ч`
    const days = Math.floor(hours / 24)
    return `${days}д`
  }

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

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
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text2 hover:bg-surface transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Новый чат
            </button>
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {chats.length === 0 && messages.length > 0 && (
              <div className="p-2 rounded-lg bg-surface text-text text-sm truncate">
                {messages[0].content.slice(0, 40)}...
              </div>
            )}
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition ${
                  currentChatId === chat.id ? 'bg-surface text-text' : 'text-text2 hover:bg-surface/50'
                }`}
                onClick={() => loadChat(chat.id)}
              >
                <span className="flex-1 truncate">{chat.title}</span>
                <span className="text-xs text-text2/50 flex-shrink-0">{timeAgo(chat.updatedAt)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }}
                  className="opacity-0 group-hover:opacity-100 text-text2 hover:text-red-400 transition flex-shrink-0 ml-1"
                  title="Удалить чат"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
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
                <div className="flex items-center gap-3">
                  <a href="/account" className="text-accent hover:underline">Кабинет</a>
                  <span className="text-border">·</span>
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
          <Link href="/pricing" className="text-sm text-text2 hover:text-text transition mr-3">Тарифы</Link>
          <Link href="/miner" className="text-sm text-text2 hover:text-text transition mr-3">Майнерам</Link>
          {user ? (
            <Link href="/account" className="text-sm px-3 py-1 rounded-lg bg-surface2 text-text font-medium hover:bg-border transition">
              Кабинет
            </Link>
          ) : (
            <Link href="/login" className="text-sm px-3 py-1 rounded-lg bg-accent text-bg font-medium hover:bg-accent/90 transition">
              Войти
            </Link>
          )}
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
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
                    <div className="bg-surface2 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-accent text-xs font-bold">R</span>
                      </div>
                      <div className={`text-sm leading-relaxed flex-1 min-w-0 ${
                        isStreaming && i === messages.length - 1 && msg.content ? 'streaming-cursor' : ''
                      }`}>
                        {msg.content ? (
                          <MarkdownContent content={msg.content} />
                        ) : (
                          isStreaming ? null : 'Думаю...'
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Typing indicator */}
        {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.content && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <div className="flex items-center gap-2 text-sm text-text2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              Razum думает...
            </div>
          </div>
        )}

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
              onChange={handleInputChange}
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
            {' · '}
            <a href="/terms" className="hover:text-text transition">Условия</a>
            {' · '}
            <a href="/privacy" className="hover:text-text transition">Конфиденциальность</a>
          </p>
        </div>
      </div>
    </div>
  )
}
