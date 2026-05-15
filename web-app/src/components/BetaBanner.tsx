'use client'
import { useEffect, useState } from 'react'

export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // SSR-safe: only check localStorage on client
    const v = typeof window !== 'undefined' && localStorage.getItem('razum_beta_dismissed_v1')
    setDismissed(v === '1')
  }, [])

  if (dismissed) return null

  function dismiss() {
    try { localStorage.setItem('razum_beta_dismissed_v1', '1') } catch {}
    setDismissed(true)
  }

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(16,185,129,0.18), rgba(59,130,246,0.10))',
      borderBottom: '1px solid rgba(16,185,129,0.3)',
      color: '#d1fae5',
      fontSize: 13,
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      lineHeight: 1.5,
      flexWrap: 'wrap',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
        <strong style={{ color: 'white' }}>Открытое тестирование</strong>
      </span>
      <span style={{ opacity: 0.85 }}>
        Razum AI работает в testnet-режиме. Возможны перебои. RZM testnet не имеет рыночной стоимости.
      </span>
      <a href="/chain" style={{ color: '#6ee7b7', textDecoration: 'underline', whiteSpace: 'nowrap' }}>статус сети</a>
      <button
        onClick={dismiss}
        aria-label="закрыть"
        style={{
          marginLeft: 8,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 4px',
        }}
      >×</button>
      <style jsx>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  )
}
