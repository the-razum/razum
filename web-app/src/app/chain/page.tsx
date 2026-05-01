import Link from 'next/link'
import { getChainStatus, getTotalSupply, getValidatorCount, CHAIN_INFO } from '@/lib/chain'

export const dynamic = 'force-dynamic'
export const revalidate = 5

export const metadata = {
  title: 'razum-testnet-1 — публичный чейн Razum AI',
  description: 'Live статус блокчейна Razum AI: высота, валидаторы, supply RZM. Cosmos SDK + CometBFT.',
}

function formatRZM(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toFixed(0)
}

export default async function ChainPage() {
  const [status, supply, vcount] = await Promise.all([
    getChainStatus(),
    getTotalSupply(),
    getValidatorCount(),
  ])
  const live = !!status
  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='font-bold text-xl'>Razum<span className='text-emerald-400'>AI</span></Link>
          <nav className='flex gap-6 text-sm text-white/70'>
            <Link href='/chat' className='hover:text-white'>Чат</Link>
            <Link href='/miner' className='hover:text-white'>Майнинг</Link>
            <Link href='/chain' className='text-white'>Чейн</Link>
            <Link href='/pricing' className='hover:text-white'>Тарифы</Link>
          </nav>
        </div>
      </header>

      <section className='max-w-5xl mx-auto px-6 py-12'>
        <div className='flex items-center gap-3 mb-2'>
          <span className={'inline-block w-2.5 h-2.5 rounded-full ' + (live ? 'bg-emerald-400 animate-pulse' : 'bg-red-500')}></span>
          <span className='text-sm uppercase tracking-wider text-white/60'>{live ? 'live' : 'offline'}</span>
        </div>
        <h1 className='text-4xl md:text-5xl font-bold tracking-tight'>
          {CHAIN_INFO.chainId}
        </h1>
        <p className='text-white/60 mt-3 max-w-2xl'>
          Публичный testnet блокчейна Razum AI. Cosmos SDK + CometBFT. Каждый запрос к AI верифицируется и записывается на цепь.
        </p>

        <div className='grid md:grid-cols-3 gap-4 mt-8'>
          <div className='rounded-2xl border border-white/10 p-5'>
            <div className='text-xs uppercase text-white/50'>Высота блока</div>
            <div className='text-3xl font-mono mt-1'>{status?.height ?? '—'}</div>
            <div className='text-xs text-white/40 mt-1'>~5s интервал</div>
          </div>
          <div className='rounded-2xl border border-white/10 p-5'>
            <div className='text-xs uppercase text-white/50'>Валидаторы</div>
            <div className='text-3xl font-mono mt-1'>{vcount ?? '—'}</div>
            <div className='text-xs text-white/40 mt-1'>BOND_STATUS_BONDED</div>
          </div>
          <div className='rounded-2xl border border-white/10 p-5'>
            <div className='text-xs uppercase text-white/50'>Total supply</div>
            <div className='text-3xl font-mono mt-1'>{supply ? formatRZM(supply.rzm) + ' RZM' : '—'}</div>
            <div className='text-xs text-white/40 mt-1'>1 RZM = 10⁹ {CHAIN_INFO.baseDenom}</div>
          </div>
        </div>

        <h2 className='text-2xl font-semibold mt-14 mb-4'>Public endpoints</h2>
        <div className='space-y-3 font-mono text-sm'>
          <div className='rounded-xl bg-white/5 border border-white/10 px-4 py-3'>
            <span className='text-white/40 mr-2'>RPC</span>
            <a className='text-emerald-300 hover:underline break-all' href='https://airazum.com/chain-rpc/status' target='_blank'>https://airazum.com/chain-rpc/</a>
          </div>
          <div className='rounded-xl bg-white/5 border border-white/10 px-4 py-3'>
            <span className='text-white/40 mr-2'>REST</span>
            <a className='text-emerald-300 hover:underline break-all' href='https://airazum.com/chain-api/cosmos/base/tendermint/v1beta1/blocks/latest' target='_blank'>https://airazum.com/chain-api/</a>
          </div>
          <div className='rounded-xl bg-white/5 border border-white/10 px-4 py-3'>
            <span className='text-white/40 mr-2'>Chain ID</span>
            <span>{CHAIN_INFO.chainId}</span>
          </div>
          <div className='rounded-xl bg-white/5 border border-white/10 px-4 py-3'>
            <span className='text-white/40 mr-2'>Base denom</span>
            <span>{CHAIN_INFO.baseDenom} (exp 0) → urzm (3) → mrzm (6) → rzm (9)</span>
          </div>
        </div>

        <h2 className='text-2xl font-semibold mt-14 mb-4'>Чем мы отличаемся от Gonka</h2>
        <ul className='space-y-3 text-white/80'>
          <li>— Полностью открытый OpenAI-совместимый API на /api/v1/chat/completions поверх чейна</li>
          <li>— Платежи в рублях через Robokassa, RZM как доходный токен майнера</li>
          <li>— Mac mini майнят через Ollama / vLLM без CUDA</li>
          <li>— ECDSA-подпись каждого ответа майнера, проверка скрытыми задачами</li>
        </ul>

        <p className='text-xs text-white/40 mt-12'>
          {status?.latestBlockTime ? `Последний блок: ${new Date(status.latestBlockTime).toISOString()}` : ''}
        </p>
      </section>
    </div>
  )
}
