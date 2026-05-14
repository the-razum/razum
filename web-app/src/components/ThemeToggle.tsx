'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('razum_theme')) as 'dark' | 'light' | null
    const t = saved || 'dark'
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('razum_theme', next) } catch {}
  }

  return (
    <button onClick={toggle} aria-label='theme' title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'inherit', borderRadius: 8, padding: '6px 10px', fontSize: 14, cursor: 'pointer' }}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
