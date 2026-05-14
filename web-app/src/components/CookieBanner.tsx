'use client'
import { useEffect, useState } from 'react'

export default function CookieBanner() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    try { if (!localStorage.getItem('razum_cookies_v1')) setShown(true) } catch {}
  }, [])
  if (!shown) return null
  function accept() {
    try { localStorage.setItem('razum_cookies_v1', '1') } catch {}
    setShown(false)
  }
  return (
    <div style={{
      position: 'fixed', bottom: 12, left: 12, right: 12, zIndex: 9998,
      background: 'rgba(13,16,23,0.95)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 12, padding: '12px 16px', color: '#e0e0e0', fontSize: 13,
      display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      backdropFilter: 'blur(8px)', maxWidth: 900, margin: '0 auto',
    }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        Razum AI использует технические cookies для аутентификации и работы сайта.
        Аналитики/рекламы нет. Подробнее — в <a href='/privacy' style={{ color: '#00e59b' }}>политике</a>.
      </span>
      <button onClick={accept} style={{
        background: '#00e59b', color: '#06080d', border: 'none',
        borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer',
      }}>Понятно</button>
    </div>
  )
}
