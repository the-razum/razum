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

        {/* Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-xl border border-border bg-surface">
            <div className="text-text2 text-sm mb-1">Имя</div>
            <div className="text-lg font-medium">{user.name}</div>
            <div className="text-text2 text-sm mt-3 mb-1">Email</div>
            <div className="text-sm">{user.email}</div>
            <div className="text-text2 text-sm mt-3 mb-1">Аккаунт создан</div>
            <div className="text-sm">{formatDate(user.createdAt)}</div>
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

        {/* Usage */}
        <div className="p-6 rounded-xl border border-border bg-surface mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Использование сегодня</div>
            <div className="text-sm text-text2">
              {user.requestsToday} / {user.requestsLimit === 99999 ? '∞' : user.requestsLimit} запросов
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
          <div className="text-text2 text-xs mt-2">
            Осталось {user.remaining === 99999 ? 'безлимитно' : user.remaining} запросов
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
