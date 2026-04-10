'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'form' | 'sent' | 'error'>('form')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('sent')
        setMessage(data.message)
      } else {
        setStatus('error')
        setMessage(data.error)
      }
    } catch {
      setStatus('error')
      setMessage('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: '#0d1017',
    border: '1px solid #30363d', borderRadius: 8, color: '#e0e0e0',
    fontSize: 15, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1017',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        background: '#161b22', borderRadius: 16, padding: '48px 40px',
        maxWidth: 420, width: '100%', border: '1px solid #30363d',
      }}>
        <h1 style={{ color: '#e0e0e0', fontSize: 22, margin: '0 0 8px', textAlign: 'center' }}>
          Восстановление пароля
        </h1>
        <p style={{ color: '#888', margin: '0 0 24px', textAlign: 'center', fontSize: 14 }}>
          Введите email от вашего аккаунта
        </p>

        {status === 'form' && (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', marginTop: 16,
                background: loading ? '#333' : '#4ade80', color: '#0d1017',
                border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Отправляем...' : 'Отправить ссылку'}
            </button>
          </form>
        )}

        {status === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <p style={{ color: '#4ade80', margin: '0 0 8px', fontWeight: 500 }}>Письмо отправлено!</p>
            <p style={{ color: '#888', margin: '0 0 24px', fontSize: 14 }}>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#f87171', margin: '0 0 16px' }}>{message}</p>
            <button
              onClick={() => setStatus('form')}
              style={{
                padding: '10px 24px', background: '#30363d', color: '#e0e0e0',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              }}
            >
              Попробовать снова
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/login" style={{ color: '#4ade80', textDecoration: 'none', fontSize: 14 }}>
            Вернуться к входу
          </Link>
        </div>
      </div>
    </div>
  )
}
