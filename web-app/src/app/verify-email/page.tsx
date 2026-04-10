'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Ссылка для подтверждения не содержит токен.')
      return
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage(data.message)
        } else {
          setStatus('error')
          setMessage(data.error)
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Ошибка соединения с сервером')
      })
  }, [token])

  return (
    <div style={{
      background: '#161b22', borderRadius: 16, padding: '48px 40px',
      maxWidth: 420, width: '100%', textAlign: 'center',
      border: '1px solid #30363d',
    }}>
      {status === 'loading' && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h1 style={{ color: '#e0e0e0', fontSize: 20, margin: '0 0 8px' }}>Проверяем...</h1>
          <p style={{ color: '#888', margin: 0 }}>Подтверждаем ваш email</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ color: '#4ade80', fontSize: 20, margin: '0 0 8px' }}>Email подтверждён!</h1>
          <p style={{ color: '#888', margin: '0 0 24px' }}>{message}</p>
          <Link href="/chat" style={{
            display: 'inline-block', padding: '12px 32px',
            background: '#4ade80', color: '#0d1017', fontWeight: 600,
            textDecoration: 'none', borderRadius: 8, fontSize: 16,
          }}>
            Перейти в чат
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h1 style={{ color: '#f87171', fontSize: 20, margin: '0 0 8px' }}>Ошибка</h1>
          <p style={{ color: '#888', margin: '0 0 24px' }}>{message}</p>
          <Link href="/login" style={{
            display: 'inline-block', padding: '12px 32px',
            background: '#30363d', color: '#e0e0e0', fontWeight: 500,
            textDecoration: 'none', borderRadius: 8, fontSize: 14,
          }}>
            Войти в аккаунт
          </Link>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0d1017',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <Suspense fallback={
        <div style={{
          background: '#161b22', borderRadius: 16, padding: '48px 40px',
          maxWidth: 420, width: '100%', textAlign: 'center',
          border: '1px solid #30363d',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h1 style={{ color: '#e0e0e0', fontSize: 20, margin: '0 0 8px' }}>Загрузка...</h1>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
