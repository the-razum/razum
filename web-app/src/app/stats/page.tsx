'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Stats = {
  users: { total: number; today: number }
  miners: { total: number; online: number; leaderboard: Array<{ name: string; status: string; tasks: number; rewards: number; reputation: number }> }
  tasks: { total: number; today: number; completed: number; daily: Array<{ day: string; c: number }> }
  tokens: { rewardedRZM: number; processedByMiners: number }
  agents: { total: number; public: number }
  chain: { chainId: string; height: number; validators: number; supplyRZM: number } | null
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('ru-RU')
}

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return <div style={{ height: 40, color: '#475569' }}>—</div>
  const max = Math.max(...data, 1)
  const W = 240, H = 50, dx = W / Math.max(data.length - 1, 1)
  const points = data.map((v, i) => `${i * dx},${H - (v / max) * H}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={points} fill='none' stroke='#10b981' strokeWidth='2' />
      <polyline points={`0,${H} ${points} ${W},${H}`} fill='rgba(16,185,129,0.15)' stroke='none' />
    </svg>
  )
}

export default function StatsPage() {
  const [s, setS] = useState<Stats | null>(null)
  const [updated, setUpdated] = useState<Date>(new Date())

  useEffect(() => {
    const load = () => fetch('/api/stats').then(r => r.json()).then(d => { setS(d); setUpdated(new Date()) }).catch(() => {})
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [])

  if (!s) {
    return <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Загружаю...</div>
  }

  const daily = s.tasks.daily.map(d => d.c)
  while (daily.length < 7) daily.unshift(0)

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href='/' style={{ fontWeight: 700, fontSize: 20, color: 'inherit', textDecoration: 'none' }}>Razum<span style={{ color: '#10b981' }}>AI</span></Link>
          <nav style={{ display: 'flex', gap: 24, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            <Link href='/chat' style={{ color: 'inherit', textDecoration: 'none' }}>Чат</Link>
            <Link href='/agents' style={{ color: 'inherit', textDecoration: 'none' }}>Агенты</Link>
            <Link href='/stats' style={{ color: '#fff', textDecoration: 'none' }}>Статистика</Link>
            <Link href='/chain' style={{ color: 'inherit', textDecoration: 'none' }}>Чейн</Link>
            <Link href='/miner' style={{ color: 'inherit', textDecoration: 'none' }}>Майнинг</Link>
          </nav>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: s.miners.online > 0 ? '#10b981' : '#ef4444', boxShadow: s.miners.online > 0 ? '0 0 12px #10b981' : 'none', animation: s.miners.online > 0 ? 'pulse 2s infinite' : 'none' }}></span>
          <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.6)' }}>{s.miners.online > 0 ? 'сеть работает' : 'сеть на паузе'}</span>
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 700, margin: '8px 0 8px' }}>Статистика сети</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 40 }}>Открытое тестирование Razum AI. Обновляется каждые 15 секунд.</p>

        {/* Top metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          <Card label='Пользователей' value={formatNum(s.users.total)} sub={`+${s.users.today} за сутки`} />
          <Card label='Майнеров онлайн' value={`${s.miners.online} / ${s.miners.total}`} sub={s.miners.online === s.miners.total ? 'все на связи' : 'часть офлайн'} />
          <Card label='Запросов выполнено' value={formatNum(s.tasks.completed)} sub={`${formatNum(s.tasks.today)} за сутки`} />
          <Card label='RZM начислено майнерам' value={formatNum(s.tokens.rewardedRZM)} sub='токенов open beta' />
          <Card label='AI-агентов создано' value={String(s.agents.total)} sub={`${s.agents.public} публичных`} />
          <Card label='Токенов обработано' value={formatNum(s.tokens.processedByMiners)} sub='модель-токены' />
        </div>

        {/* Activity chart */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Запросов за последние 7 дней</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Каждый запрос обрабатывается одним из майнеров сети</p>
            </div>
            <Sparkline data={daily} />
          </div>
        </div>

        {/* Miners leaderboard */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Топ майнеров</h2>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Майнер</th>
                <th style={{ textAlign: 'center', padding: '8px 4px' }}>Статус</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Запросов</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>RZM</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Репутация</th>
              </tr>
            </thead>
            <tbody>
              {s.miners.leaderboard.map((m, i) => (
                <tr key={m.name} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 4px', color: 'rgba(255,255,255,0.4)' }}>{i + 1}</td>
                  <td style={{ padding: '12px 4px', fontWeight: 500 }}>{m.name}</td>
                  <td style={{ padding: '12px 4px', textAlign: 'center' }}>
                    <span style={{ color: m.status === 'online' ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{m.status === 'online' ? '● онлайн' : '○ офлайн'}</span>
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'monospace' }}>{m.tasks.toLocaleString('ru-RU')}</td>
                  <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'monospace', color: '#10b981' }}>{m.rewards.toFixed(2)}</td>
                  <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'monospace' }}>{m.reputation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>Хочешь попасть в топ? <Link href='/miner' style={{ color: '#10b981' }}>Подключи свой компьютер</Link></p>
        </div>

        {/* Blockchain */}
        {s.chain && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Блокчейн</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, fontSize: 14 }}>
              <div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>Сеть</div><div style={{ fontFamily: 'monospace' }}>{s.chain.chainId}</div></div>
              <div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>Высота блока</div><div style={{ fontFamily: 'monospace', fontSize: 18 }}>{s.chain.height.toLocaleString('ru-RU')}</div></div>
              <div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>Валидаторов</div><div style={{ fontFamily: 'monospace', fontSize: 18 }}>{s.chain.validators}</div></div>
              <div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>Общий supply</div><div style={{ fontFamily: 'monospace', fontSize: 18 }}>{formatNum(s.chain.supplyRZM)} RZM</div></div>
            </div>
            <Link href='/chain' style={{ display: 'inline-block', marginTop: 16, color: '#10b981', fontSize: 13 }}>Открыть обозреватель блоков →</Link>
          </div>
        )}

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 24 }}>
          Обновлено: {updated.toLocaleTimeString('ru-RU')} · RZM сейчас тестовые, без рыночной стоимости.
        </p>
      </section>

      <style jsx global>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1, marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{sub}</div>}
    </div>
  )
}
