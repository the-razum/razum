'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!agreed) { setError('Подтвердите возраст и согласие на обработку ПД'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, name, password,
          ref: (document.cookie.match(/razum_ref=([^;]+)/) || [])[1] || ''
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации')
        return
      }

      router.push('/chat')
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#06080d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#0d1017',
        border: '1px solid #1c2130',
        borderRadius: 20,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 420,
        margin: '0 20px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #00e59b, #00c4ff)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 16,
          }}>
            ⛓️
          </div>
          <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Создать аккаунт
          </h1>
          <p style={{ color: '#8294a8', fontSize: 15 }}>
            Бесплатно · 30 запросов в день
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#8294a8', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
              Имя
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Как вас зовут"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: '#141820', border: '1px solid #1c2130',
                borderRadius: 10, color: '#e2e8f0', fontSize: 15,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#8294a8', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: '#141820', border: '1px solid #1c2130',
                borderRadius: 10, color: '#e2e8f0', fontSize: 15,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#8294a8', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
              style={{
                width: '100%', padding: '12px 16px',
                background: '#141820', border: '1px solid #1c2130',
                borderRadius: 10, color: '#e2e8f0', fontSize: 15,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px',
              color: '#ef4444', fontSize: 14,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16, fontSize: 13, color: '#8294a8', cursor: 'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
            <span>
              Мне 18+, я согласен с <a href="/terms" target="_blank" style={{ color: '#00e59b' }}>условиями</a> и обработкой моих персональных данных согласно <a href="/privacy" target="_blank" style={{ color: '#00e59b' }}>политике конфиденциальности</a>.
            </span>
          </label>
          <button
            type="submit"
            disabled={loading || !agreed}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#065f46' : '#00e59b',
              color: '#06080d', border: 'none',
              borderRadius: 10, fontSize: 16, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Создаём...' : 'Создать аккаунт'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#8294a8', fontSize: 14 }}>
          Уже есть аккаунт?{' '}
          <a href="/login" style={{ color: '#00e59b', textDecoration: 'none' }}>
            Войти
          </a>
        </p>

        <div style={{
          marginTop: 24, padding: '16px',
          background: 'rgba(0,229,155,0.05)',
          border: '1px solid rgba(0,229,155,0.1)',
          borderRadius: 12, textAlign: 'center',
        }}>
          <p style={{ color: '#8294a8', fontSize: 13, margin: 0 }}>
            Free: 30 запросов/день · Старт 490 ₽: 500/день · Базовый 990 ₽: 2000/день
          </p>
        </div>
      </div>
    </div>
  )
}
