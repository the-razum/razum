'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface UserData {
  id: string
  email: string
  name: string
  plan: string
  planName: string
  planExpired: boolean
  planExpiresAt: string | null
  requestsToday: number
  requestsLimit: number
  remaining: number
  createdAt: string
}

interface PaymentData {
  id: string
  amount: number
  plan: string
  planName: string
  status: string
  createdAt: string
  completedAt: string
}

export default function AccountPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><div className="text-text2">Загрузка...</div></div>}>
      <AccountPage />
    </Suspense>
  )
}

function AccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserData | null>(null)
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  // Edit name
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  // Change password
  const [showPassword, setShowPassword] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }

    fetch('/api/account')
      .then(r => {
        if (r.status === 401) {
          router.push('/login')
          return null
        }
        return r.json()
      })
      .then(data => {
        if (data) {
          setUser(data.user)
          setPayments(data.payments || [])
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router, searchParams])

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/')
  }

  async function handleNameSave() {
    if (!newName.trim() || newName.trim().length < 2) {
      setNameMsg('Минимум 2 символа')
      return
    }
    setNameLoading(true)
    setNameMsg('')
    try {
      const r = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await r.json()
      if (r.ok) {
        setUser(prev => prev ? { ...prev, name: newName.trim() } : null)
        setEditingName(false)
        setNameMsg('')
      } else {
        setNameMsg(data.error || 'Ошибка')
      }
    } catch {
      setNameMsg('Ошибка сети')
    }
    setNameLoading(false)
  }

  async function handlePasswordChange() {
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: 'error', text: 'Заполните все поля' })
      return
    }
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Минимум 6 символов' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Пароли не совпадают' })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    try {
      const r = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await r.json()
      if (r.ok) {
        setPwMsg({ type: 'success', text: 'Пароль изменён' })
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => { setPwMsg(null); setShowPassword(false) }, 2000)
      } else {
        setPwMsg({ type: 'error', text: data.error || 'Ошибка' })
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Ошибка сети' })
    }
    setPwLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text2">Загрузка...</div>
      </div>
    )
  }

  if (!user) return null

  const usagePercent = user.requestsLimit > 0
    ? Math.min(100, Math.round((user.requestsToday / user.requestsLimit) * 100))
    : 0

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const daysLeft = user.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Razum AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/chat" className="text-sm text-text2 hover:text-text transition">
              Чат
            </Link>
            <button onClick={handleLogout} className="text-sm text-text2 hover:text-red-400 transition">
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {showSuccess && (
          <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm">
            Оплата прошла успешно! Тариф активирован.
          </div>
        )}

        {user.planExpired && (
          <div className="mb-6 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm">
            Ваша подписка истекла. Вы переведены на бесплатный тариф.{' '}
            <Link href="/pricing" className="underline font-medium">Продлить</Link>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-8">Мой аккаунт</h1>

        {/* Profile + Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between mb-3">
              <div className="text-text2 text-sm">Имя</div>
              {!editingName && (
                <button
                  onClick={() => { setNewName(user.name); setEditingName(true); setNameMsg('') }}
                  className="text-xs text-accent hover:underline"
                >
                  Изменить
                </button>
              )}
            </div>
            {editingName ? (
              <div className="flex gap-2 mb-3">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-bg border border-border text-sm text-text focus:outline-none focus:border-accent"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                />
                <button
                  onClick={handleNameSave}
                  disabled={nameLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-bg hover:bg-accent/90 disabled:opacity-50"
                >
                  {nameLoading ? '...' : 'Сохранить'}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameMsg('') }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-text2 hover:text-text"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="text-lg font-medium mb-3">{user.name}</div>
            )}
            {nameMsg && <div className="text-xs text-red-400 mb-2">{nameMsg}</div>}

            <div className="text-text2 text-sm mb-1">Email</div>
            <div className="text-sm mb-3">{user.email}</div>
            <div className="text-text2 text-sm mb-1">Аккаунт создан</div>
            <div className="text-sm">{formatDate(user.createdAt)}</div>

            {/* Password section */}
            <div className="mt-4 pt-4 border-t border-border">
              {!showPassword ? (
                <button
                  onClick={() => setShowPassword(true)}
                  className="text-sm text-accent hover:underline"
                >
                  Сменить пароль
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Смена пароля</div>
                  <input
                    type="password"
                    placeholder="Текущий пароль"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text focus:outline-none focus:border-accent"
                  />
                  <input
                    type="password"
                    placeholder="Новый пароль (мин. 6 символов)"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text focus:outline-none focus:border-accent"
                  />
                  <input
                    type="password"
                    placeholder="Подтвердите пароль"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordChange()}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text focus:outline-none focus:border-accent"
                  />
                  {pwMsg && (
                    <div className={`text-xs ${pwMsg.type === 'success' ? 'text-accent' : 'text-red-400'}`}>
                      {pwMsg.text}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={pwLoading}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-bg hover:bg-accent/90 disabled:opacity-50"
                    >
                      {pwLoading ? 'Сохраняю...' : 'Изменить пароль'}
                    </button>
                    <button
                      onClick={() => { setShowPassword(false); setPwMsg(null); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}
                      className="px-4 py-2 text-sm rounded-lg border border-border text-text2 hover:text-text"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-surface">
            <div className="text-text2 text-sm mb-1">Текущий тариф</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">{user.planName}</span>
              {user.plan !== 'free' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-medium">
                  Активен
                </span>
              )}
            </div>
            {daysLeft !== null && daysLeft > 0 && (
              <div className="text-text2 text-sm mt-1">
                Осталось {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
              </div>
            )}
            {user.planExpiresAt && (
              <div className="text-text2 text-xs mt-1">
                Действует до {formatDate(user.planExpiresAt)}
              </div>
            )}

            {/* Usage bar inline */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-text2">Сегодня</div>
                <div className="text-xs text-text2">
                  {user.requestsToday} / {user.requestsLimit === 99999 ? '∞' : user.requestsLimit}
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-surface2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-orange-400' : 'bg-accent'
                  }`}
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
              <div className="text-text2 text-xs mt-1">
                Осталось {user.remaining === 99999 ? 'безлимитно' : user.remaining} запросов
              </div>
            </div>

            <div className="mt-4">
              <Link
                href="/pricing"
                className="inline-block px-4 py-2 text-sm font-medium rounded-lg bg-accent text-bg hover:bg-accent/90 transition"
              >
                {user.plan === 'free' ? 'Выбрать тариф' : 'Сменить тариф'}
              </Link>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="font-medium">История платежей</div>
          </div>
          {payments.length === 0 ? (
            <div className="p-6 text-text2 text-sm text-center">
              Платежей пока нет.{' '}
              <Link href="/pricing" className="text-accent hover:underline">Выбрать тариф</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map(p => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Тариф «{p.planName}»</div>
                    <div className="text-text2 text-xs mt-0.5">{formatDate(p.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{p.amount} ₽</div>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      p.status === 'completed'
                        ? 'bg-accent/15 text-accent'
                        : p.status === 'pending'
                        ? 'bg-yellow-500/15 text-yellow-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {p.status === 'completed' ? 'Оплачен' : p.status === 'pending' ? 'Ожидание' : 'Ошибка'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support */}
        <div className="mt-8 text-center text-text2 text-sm">
          Вопросы? Напишите в{' '}
          <a href="https://t.me/razum_ai" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Telegram
          </a>
          {' '}или на{' '}
          <a href="mailto:support@airazum.com" className="text-accent hover:underline">
            support@airazum.com
          </a>
        </div>
      </div>
    </div>
  )
}
