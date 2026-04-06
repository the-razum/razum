'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка входа')
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
            Войти в Razum AI
          </h1>
          <p style={{ color: '#8294a8', fontSize: 15 }}>
            Ваш AI-ассистент ждёт
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#065f46' : '#00e59b',
              color: '#06080d', border: 'none',
              borderRadius: 10, fontSize: 16, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#8294a8', fontSize: 14 }}>
          Нет аккаунта?{' '}
          <a href="/register" style={{ color: '#00e59b', textDecoration: 'none' }}>
            Зарегистрироваться
          </a>
        </p>

        <p style={{ textAlign: 'center', marginTop: 12, color: '#4a5568', fontSize: 13 }}>
          <a href="/chat" style={{ color: '#4a5568', textDecoration: 'none' }}>
            Или попробовать без регистрации →
          </a>
        </p>
      </div>
    </div>
  )
}
