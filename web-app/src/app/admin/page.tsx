'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  usersToday: number
  totalMiners: number
  onlineMiners: number
  totalChats: number
  totalMessages: number
  totalTasks: number
  completedTasks: number
  totalPayments: number
  revenue: number
  planBreakdown: { plan: string; count: number }[]
}

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  plan: string
  requestsToday: number
  createdAt: string
}

interface MinerRow {
  id: string
  name: string
  gpuModel: string
  status: string
  totalTasks: number
  successfulTasks: number
  reputation: number
  lastSeen: string
  models: string[]
}

type Tab = 'dashboard' | 'users' | 'miners'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [miners, setMiners] = useState<MinerRow[]>([])
  const [minersTotal, setMinersTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (tab === 'users' && users.length === 0) loadUsers()
    if (tab === 'miners' && miners.length === 0) loadMiners()
  }, [tab])

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 403) { setError('Доступ запрещён. Вы не администратор.'); setLoading(false); return }
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.ok) throw new Error('Ошибка загрузки')
      setStats(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Ошибка')
      const data = await res.json()
      setUsers(data.users)
      setUsersTotal(data.total)
    } catch {}
  }

  async function loadMiners() {
    try {
      const res = await fetch('/api/admin/miners')
      if (!res.ok) throw new Error('Ошибка')
      const data = await res.json()
      setMiners(data.miners)
      setMinersTotal(data.total)
    } catch {}
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (!confirm(`Сменить роль на "${newRole}"?`)) return
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } else {
      const err = await res.json()
      alert(err.error || 'Ошибка')
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Удалить пользователя ${email}? Все его данные будут удалены.`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId))
      setUsersTotal(prev => prev - 1)
      loadStats()
    } else {
      const err = await res.json()
      alert(err.error || 'Ошибка')
    }
  }

  function formatDate(iso: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function timeAgo(iso: string) {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'только что'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
    return `${Math.floor(diff / 86400000)} дн назад`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-lg">{error}</div>
        <Link href="/" className="text-emerald-400 hover:underline">← На главную</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-emerald-400 font-bold text-xl">Razum AI</Link>
          <span className="text-gray-500">/ Admin</span>
        </div>
        <Link href="/chat" className="text-sm text-gray-400 hover:text-white">← К чату</Link>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-4 md:px-8">
        <div className="flex gap-1">
          {(['dashboard', 'users', 'miners'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t === 'dashboard' ? 'Дашборд' : t === 'users' ? `Пользователи (${stats?.totalUsers || 0})` : `Майнеры (${stats?.totalMiners || 0})`}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {/* Dashboard */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Пользователи" value={stats.totalUsers} sub={`+${stats.usersToday} сегодня`} />
              <StatCard label="Майнеры онлайн" value={stats.onlineMiners} sub={`из ${stats.totalMiners}`} color="emerald" />
              <StatCard label="Чаты" value={stats.totalChats} sub={`${stats.totalMessages} сообщений`} />
              <StatCard label="Задачи" value={stats.completedTasks} sub={`из ${stats.totalTasks}`} color="emerald" />
            </div>

            {/* Revenue + plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <h3 className="text-gray-400 text-sm mb-4">Выручка</h3>
                <div className="text-3xl font-bold text-emerald-400">{stats.revenue.toLocaleString('ru-RU')} ₽</div>
                <div className="text-gray-500 text-sm mt-1">{stats.totalPayments} платежей</div>
              </div>
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <h3 className="text-gray-400 text-sm mb-4">Планы пользователей</h3>
                <div className="space-y-2">
                  {stats.planBreakdown.map(p => (
                    <div key={p.plan} className="flex justify-between items-center">
                      <span className="text-gray-300 capitalize">{p.plan}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${stats.totalUsers > 0 ? (p.count / stats.totalUsers * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm w-8 text-right">{p.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div className="text-sm text-gray-500 mb-4">Всего: {usersTotal}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Имя</th>
                    <th className="pb-3 pr-4">Роль</th>
                    <th className="pb-3 pr-4">План</th>
                    <th className="pb-3 pr-4">Запросов сегодня</th>
                    <th className="pb-3 pr-4">Регистрация</th>
                    <th className="pb-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-[#111]">
                      <td className="py-3 pr-4 text-gray-300">{u.email}</td>
                      <td className="py-3 pr-4 text-gray-300">{u.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${u.plan !== 'free' ? 'bg-amber-900/50 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400">{u.requestsToday}</td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(u.createdAt)}</td>
                      <td className="py-3 flex gap-2">
                        <button
                          onClick={() => toggleRole(u.id, u.role)}
                          className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                        >
                          {u.role === 'admin' ? 'Убрать admin' : 'Сделать admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-xs px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Miners */}
        {tab === 'miners' && (
          <div>
            <div className="text-sm text-gray-500 mb-4">Всего: {minersTotal}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-3 pr-4">Имя</th>
                    <th className="pb-3 pr-4">GPU</th>
                    <th className="pb-3 pr-4">Статус</th>
                    <th className="pb-3 pr-4">Модели</th>
                    <th className="pb-3 pr-4">Задачи</th>
                    <th className="pb-3 pr-4">Репутация</th>
                    <th className="pb-3">Последняя активность</th>
                  </tr>
                </thead>
                <tbody>
                  {miners.map(m => (
                    <tr key={m.id} className="border-b border-gray-800/50 hover:bg-[#111]">
                      <td className="py-3 pr-4 text-gray-300 font-medium">{m.name}</td>
                      <td className="py-3 pr-4 text-gray-400">{m.gpuModel || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                          m.status === 'online' ? 'bg-emerald-900/50 text-emerald-400' :
                          m.status === 'busy' ? 'bg-amber-900/50 text-amber-400' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            m.status === 'online' ? 'bg-emerald-400' :
                            m.status === 'busy' ? 'bg-amber-400' :
                            'bg-gray-500'
                          }`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{(m.models || []).join(', ') || '—'}</td>
                      <td className="py-3 pr-4 text-gray-400">
                        {m.successfulTasks}/{m.totalTasks}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(m.reputation / 10, 100)}%` }}
                            />
                          </div>
                          <span className="text-gray-400 text-xs">{m.reputation}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">{timeAgo(m.lastSeen)}</td>
                    </tr>
                  ))}
                  {miners.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">Нет зарегистрированных майнеров</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'white' }: { label: string; value: number; sub: string; color?: string }) {
  return (
    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
      <div className="text-gray-400 text-sm mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>
        {value.toLocaleString('ru-RU')}
      </div>
      <div className="text-gray-500 text-xs mt-1">{sub}</div>
    </div>
  )
}
