'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function FaucetPage() {
  const [addr, setAddr] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function claim() {
    setBusy(true); setResult(null); setError(null)
    try {
      const r = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr.trim() }),
      })
      const j = await r.json()
      if (!r.ok) {
        setError(`${j.error || 'failed'}${j.waitMinutes ? ` — wait ${j.waitMinutes} min` : ''}`)
      } else {
        setResult(j)
      }
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='font-bold text-xl'>Razum<span className='text-emerald-400'>AI</span></Link>
          <nav className='flex gap-6 text-sm text-white/70'>
            <Link href='/chat' className='hover:text-white'>Чат</Link>
            <Link href='/miner' className='hover:text-white'>Майнинг</Link>
            <Link href='/chain' className='hover:text-white'>Чейн</Link>
            <Link href='/faucet' className='text-white'>Faucet</Link>
          </nav>
        </div>
      </header>

      <section className='max-w-2xl mx-auto px-6 py-14'>
        <div className='inline-flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-300 bg-emerald-300/10 px-2 py-1 rounded'>
          razum-testnet-1 · live faucet
        </div>
        <h1 className='text-4xl md:text-5xl font-bold mt-4'>Получи 100 RZM</h1>
        <p className='text-white/60 mt-3'>
          Тестовые токены для разработки и подключения майнера. Лимит: 1 раз в час с одного IP и адреса.
        </p>

        <div className='mt-8 rounded-2xl border border-white/10 bg-white/5 p-6'>
          <label className='block text-sm text-white/70 mb-2'>Razum-адрес</label>
          <input
            value={addr}
            onChange={e => setAddr(e.target.value)}
            placeholder='razum1...'
            className='w-full bg-black/50 border border-white/15 rounded-lg px-3 py-3 font-mono text-sm focus:outline-none focus:border-emerald-400'
            autoComplete='off'
          />
          <button
            onClick={claim}
            disabled={busy || !addr.trim()}
            className='mt-4 w-full bg-emerald-400 text-black font-semibold py-3 rounded-lg disabled:opacity-50 hover:bg-emerald-300 transition'
          >
            {busy ? 'Отправляю…' : 'Получить 100 RZM'}
          </button>

          {error && (
            <div className='mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm'>
              {error}
            </div>
          )}
          {result && (
            <div className='mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm space-y-2'>
              <div className='font-semibold'>Готово · {result.amount}</div>
              <div className='font-mono text-xs break-all'>tx: {result.txhash}</div>
              <a className='underline' href={`/chain-rpc/tx?hash=0x${result.txhash}`} target='_blank'>посмотреть транзакцию</a>
            </div>
          )}
        </div>

        <div className='mt-10'>
          <h2 className='text-xl font-semibold mb-3'>Нет адреса?</h2>
          <p className='text-white/70 text-sm'>
            Установи <a href='https://keplr.app' target='_blank' className='text-emerald-300 underline'>Keplr</a> или{' '}
            <a href='https://leapwallet.io' target='_blank' className='text-emerald-300 underline'>Leap Wallet</a>, добавь сеть razum-testnet-1, скопируй адрес.
            Параметры сети: chain-id <code>razum-testnet-1</code>, RPC <code>https://airazum.com/chain-rpc/</code>, base denom <code>nrazum</code> (9 decimals → RZM).
          </p>
          <p className='text-white/70 text-sm mt-3'>
            Или сгенерируй адрес из CLI:
          </p>
          <pre className='mt-2 bg-black/50 border border-white/10 rounded-lg p-4 overflow-x-auto text-xs'>
{`curl -L https://airazum.com/install/razumd | bash
razumd keys add me --keyring-backend test
razumd keys show me -a --keyring-backend test`}
          </pre>
        </div>
      </section>
    </div>
  )
}
