import Link from 'next/link'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function MetricsPage() {
  const token = cookies().get('razum_token')?.value
  const userId = token ? verifyToken(token) : null
  if (!userId) return <div className='p-10 text-white bg-black min-h-screen'>Залогиньтесь как admin</div>

  const db = getDB()
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any
  if (user?.role !== 'admin') return <div className='p-10 text-white bg-black min-h-screen'>Доступ только для admin</div>

  const counts = db.prepare("SELECT status, COUNT(*) AS c FROM tasks WHERE createdAt > datetime('now','-24 hours') GROUP BY status").all() as any[]
  const byModel = db.prepare("SELECT model, COUNT(*) AS c FROM tasks WHERE createdAt > datetime('now','-24 hours') GROUP BY model ORDER BY c DESC").all() as any[]
  const latencies = db.prepare("SELECT (julianday(completedAt)-julianday(startedAt))*86400000 AS ms FROM tasks WHERE status='completed' AND createdAt > datetime('now','-24 hours') AND completedAt IS NOT NULL AND startedAt IS NOT NULL ORDER BY ms").all() as Array<{ms:number}>
  const lat = latencies.map(r => r.ms).filter(x => x >= 0 && x < 600000)
  const p = (q: number) => lat.length ? Math.round(lat[Math.floor(lat.length * q)] || 0) : 0
  const miners = db.prepare("SELECT name, status, lastSeen, totalTasks, totalRewards FROM miners ORDER BY lastSeen DESC").all() as any[]
  const totalUsers = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as any).c

  return (
    <div className='min-h-screen bg-black text-white px-6 py-10 max-w-5xl mx-auto'>
      <Link href='/admin' className='text-sm text-white/60 hover:text-white'>← admin</Link>
      <h1 className='text-3xl font-bold mt-2 mb-8'>Метрики · последние 24ч</h1>

      <div className='grid md:grid-cols-4 gap-4 mb-10'>
        <div className='rounded-2xl border border-white/10 p-4'>
          <div className='text-xs uppercase text-white/50'>Юзеров всего</div>
          <div className='text-3xl font-mono'>{totalUsers}</div>
        </div>
        {counts.map(c => (
          <div key={c.status} className='rounded-2xl border border-white/10 p-4'>
            <div className='text-xs uppercase text-white/50'>{c.status}</div>
            <div className='text-3xl font-mono'>{c.c}</div>
          </div>
        ))}
      </div>

      <h2 className='text-xl font-semibold mb-3'>Latency (мс)</h2>
      <div className='grid md:grid-cols-6 gap-3 mb-10'>
        <div className='rounded-xl border border-white/10 p-3'><div className='text-xs text-white/50'>p50</div><div className='font-mono text-xl text-emerald-300'>{p(0.5)}</div></div>
        <div className='rounded-xl border border-white/10 p-3'><div className='text-xs text-white/50'>p75</div><div className='font-mono text-xl'>{p(0.75)}</div></div>
        <div className='rounded-xl border border-white/10 p-3'><div className='text-xs text-white/50'>p90</div><div className='font-mono text-xl'>{p(0.9)}</div></div>
        <div className='rounded-xl border border-white/10 p-3'><div className='text-xs text-white/50'>p95</div><div className='font-mono text-xl text-yellow-300'>{p(0.95)}</div></div>
        <div className='rounded-xl border border-white/10 p-3'><div className='text-xs text-white/50'>p99</div><div className='font-mono text-xl text-red-300'>{p(0.99)}</div></div>
        <div className='rounded-xl border border-white/10 p-3'><div className='text-xs text-white/50'>n</div><div className='font-mono text-xl text-white/60'>{lat.length}</div></div>
      </div>

      <h2 className='text-xl font-semibold mb-3'>По моделям</h2>
      <table className='w-full text-sm mb-10'>
        <thead><tr className='text-white/50'><th className='text-left p-2'>Model</th><th className='text-right p-2'>Tasks</th></tr></thead>
        <tbody>{byModel.map(m => <tr key={m.model} className='border-t border-white/10'><td className='p-2'>{m.model}</td><td className='p-2 text-right font-mono'>{m.c}</td></tr>)}</tbody>
      </table>

      <h2 className='text-xl font-semibold mb-3'>Майнеры</h2>
      <table className='w-full text-sm'>
        <thead><tr className='text-white/50'><th className='text-left p-2'>Name</th><th className='text-center p-2'>Status</th><th className='text-right p-2'>Tasks</th><th className='text-right p-2'>Rewards</th><th className='text-right p-2'>Last seen</th></tr></thead>
        <tbody>{miners.map(m => <tr key={m.name} className='border-t border-white/10'>
          <td className='p-2'>{m.name}</td>
          <td className='p-2 text-center'>{m.status === 'online' ? <span className='text-emerald-400'>●</span> : <span className='text-white/30'>○</span>}</td>
          <td className='p-2 text-right font-mono'>{m.totalTasks}</td>
          <td className='p-2 text-right font-mono'>{Number(m.totalRewards || 0).toFixed(2)}</td>
          <td className='p-2 text-right text-white/40 text-xs'>{m.lastSeen}</td>
        </tr>)}</tbody>
      </table>
    </div>
  )
}
