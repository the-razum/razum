'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d1017',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <div style={{
          background: '#161b22', borderRadius: 16, padding: '48px 40px',
          maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid #30363d',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h1 style={{ color: '#f87171', fontSize: 20 }}>Ссылка недействительна</h1>
          <p style={{ color: '#888', fontSize: 14 }}>Токен для сброса пароля отсутствует.</p>
          <Link href="/forgot-password" style={{
            display: 'inline-block', marginTop: 16, padding: '10px 24px',
            background: '#30363d', color: '#e0e0e0', borderRadius: 8,
            textDecoration: 'none', fontSize: 14,
          }}>
            Запросить новую ссылку
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Пароли не совпадают')
      setStatus('error')
      return
    }
    if (password.length < 8) {
      setMessage('Пароль минимум 8 символов')
      setStatus('error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
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
    marginBottom: 12,
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
          Новый пароль
        </h1>
        <p style={{ color: '#888', margin: '0 0 24px', textAlign: 'center', fontSize: 14 }}>
          Придумайте новый пароль для вашего аккаунта
        </p>

        {status === 'form' && (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Новый пароль (мин. 8 символов)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              required
              autoFocus
              minLength={8}
            />
            <input
              type="password"
              placeholder="Подтвердите пароль"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
              minLength={8}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', marginTop: 4,
                background: loading ? '#333' : '#4ade80', color: '#0d1017',
                border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#4ade80', margin: '0 0 8px', fontWeight: 500 }}>Пароль изменён!</p>
            <p style={{ color: '#888', margin: '0 0 24px', fontSize: 14 }}>{message}</p>
            <Link href="/login" style={{
              display: 'inline-block', padding: '12px 32px',
              background: '#4ade80', color: '#0d1017', fontWeight: 600,
              textDecoration: 'none', borderRadius: 8, fontSize: 16,
            }}>
              Войти
            </Link>
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
      </div>
    </div>
  )
}
