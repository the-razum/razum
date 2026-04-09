'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0 ₽',
    period: '',
    desc: 'Без регистрации',
    features: ['10 запросов/день (гость)', '30 запросов/день (аккаунт)', 'DeepSeek R1 + Mistral', 'Поиск в интернете'],
    cta: 'Начать бесплатно',
    featured: false,
  },
  {
    id: 'start',
    name: 'Старт',
    price: '490 ₽',
    period: '/мес',
    desc: 'Дешевле чашки кофе',
    features: ['500 запросов/день', 'Все модели', 'Поиск в интернете', 'Приоритетная очередь'],
    cta: 'Подключить',
    featured: false,
  },
  {
    id: 'basic',
    name: 'Базовый',
    price: '990 ₽',
    period: '/мес',
    desc: 'Для ежедневной работы',
    features: ['2 000 запросов/день', 'Быстрые ноды', 'Поддержка в Telegram', 'Приоритетная очередь'],
    cta: 'Подключить',
    featured: true,
  },
  {
    id: 'pro',
    name: 'Про',
    price: '1 990 ₽',
    period: '/мес',
    desc: 'Для профессионалов',
    features: ['Безлимит запросов', 'Все модели + быстрые ноды', 'Приоритетная поддержка 24/7', 'Ранний доступ к новым функциям'],
    cta: 'Подключить',
    featured: false,
  },
]

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user) setCurrentPlan(data.user.plan)
    }).catch(() => {})
  }, [])

  async function handleSubscribe(planId: string) {
    if (planId === 'free') {
      window.location.href = '/chat'
      return
    }

    if (!currentPlan) {
      // Not logged in
      window.location.href = '/register'
      return
    }

    setLoading(planId)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()

      if (data.confirmation_url) {
        window.location.href = data.confirmation_url
      } else if (data.error) {
        alert(data.error)
      }
    } catch {
      alert('Ошибка соединения')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Razum AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/chat" className="text-sm text-text2 hover:text-text transition">Чат</Link>
            <Link href="/miner" className="text-sm text-text2 hover:text-text transition">Майнерам</Link>
            {currentPlan ? (
              <Link href="/account" className="text-sm px-3 py-1 rounded-lg bg-surface2 text-text font-medium hover:bg-border transition">Кабинет</Link>
            ) : (
              <Link href="/login" className="text-sm text-accent hover:underline">Войти</Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Простые цены. Платите картой.</h1>
          <p className="text-text2 text-lg">
            Карта МИР, СБП, ЮKassa. Без VPN, без валютных проблем.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.featured
                  ? 'border-accent bg-accent/5 relative'
                  : 'border-border bg-surface'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-bg text-xs font-bold rounded-full">
                  Популярный
                </div>
              )}
              {currentPlan === plan.id && (
                <div className="absolute -top-3 right-4 px-3 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                  Текущий
                </div>
              )}
              <div className="text-lg font-semibold">{plan.name}</div>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-text2 text-sm">{plan.period}</span>
              </div>
              <div className="text-text2 text-sm mt-1">{plan.desc}</div>
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={currentPlan === plan.id || loading === plan.id}
                className={`mt-6 block text-center py-2.5 rounded-lg font-medium text-sm transition w-full ${
                  currentPlan === plan.id
                    ? 'bg-surface2 text-text2 cursor-default'
                    : plan.featured
                    ? 'bg-accent text-bg hover:bg-accent/90'
                    : 'bg-surface2 text-text hover:bg-border'
                }`}
              >
                {loading === plan.id ? 'Переход к оплате...' : currentPlan === plan.id ? 'Активен' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-text2 text-sm">
          <p>Оплата картой МИР, СБП. Скоро: оплата RZM-токенами со скидкой 20%. Для бизнеса — <a href="mailto:support@airazum.com" className="text-accent hover:underline">напишите нам</a>.</p>
        </div>
      </div>
    </div>
  )
}
