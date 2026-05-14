import Link from 'next/link'
import { getChainStatus, getTotalSupply, getValidatorCount, getRecentBlocks, getValidators, CHAIN_INFO } from '@/lib/chain'

export const dynamic = 'force-dynamic'
export const revalidate = 5

export const metadata = {
  title: 'razum-testnet-1 — Block Explorer | Razum AI',
  description: 'Live статус блокчейна Razum AI: блоки, транзакции, валидаторы, supply RZM.',
  openGraph: {
    title: 'razum-testnet-1 — Block Explorer | Razum AI',
    description: 'Live статус блокчейна Razum AI: блоки, валидаторы, supply RZM.',
    url: 'https://airazum.com/chain',
    siteName: 'Razum AI',
    locale: 'ru_RU',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Razum AI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'razum-testnet-1 — Block Explorer | Razum AI',
    description: 'Live статус блокчейна Razum AI: блоки, валидаторы, supply RZM.',
    images: ['/og-image.png'],
  },
}

function formatRZM(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toFixed(0)
}
function shortHex(h: string, n = 8) { return h ? h.slice(0, n) + '...' : '-' }

export default async function ChainPage() {
  const [status, supply, vcount, blocks, validators] = await Promise.all([
    getChainStatus(), getTotalSupply(), getValidatorCount(),
    getRecentBlocks(10), getValidators(),
  ])
  const live = !!status
  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='max-w-6xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='font-bold text-xl'>Razum<span className='text-emerald-400'>AI</span></Link>
          <nav className='flex gap-6 text-sm text-white/70'>
            <Link href='/chat' className='hover:text-white'>Чат</Link>
            <Link href='/agents' className='hover:text-white'>Агенты</Link>
            <Link href='/miner' className='hover:text-white'>Майнинг</Link>
            <Link href='/chain' className='text-white'>Чейн</Link>
            <Link href='/docs' className='hover:text-white'>Docs</Link>
          </nav>
        </div>
      </header>

      <section className='max-w-6xl mx-auto px-6 py-12'>
        <div className='flex items-center gap-3 mb-2'>
          <span className={'inline-block w-2.5 h-2.5 rounded-full ' + (live ? 'bg-emerald-400 animate-pulse' : 'bg-red-500')}></span>
          <span className='text-sm uppercase tracking-wider text-white/60'>{live ? 'live' : 'offline'}</span>
        </div>
        <h1 className='text-4xl md:text-5xl font-bold tracking-tight'>
          {CHAIN_INFO.chainId} <span className='text-white/40 text-2xl font-normal'>· block explorer</span>
        </h1>
        <p className='text-white/60 mt-3 max-w-2xl'>
          Публичный testnet блокчейна Razum AI. Cosmos SDK + CometBFT. ~5s block time.
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
            <div className='text-xs text-white/40 mt-1'>{validators.length} total, {validators.filter(v => !v.jailed).length} active</div>
          </div>
          <div className='rounded-2xl border border-white/10 p-5'>
            <div className='text-xs uppercase text-white/50'>Total supply</div>
            <div className='text-3xl font-mono mt-1'>{supply ? formatRZM(supply.rzm) + ' RZM' : '—'}</div>
            <div className='text-xs text-white/40 mt-1'>1 RZM = 10⁹ {CHAIN_INFO.baseDenom}</div>
          </div>
        </div>

        <h2 className='text-2xl font-semibold mt-12 mb-4'>Последние блоки</h2>
        <div className='rounded-2xl border border-white/10 overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-white/5 text-white/60 text-xs uppercase'>
              <tr><th className='text-left p-3'>Height</th><th className='text-left p-3'>Hash</th><th className='text-left p-3'>Proposer</th><th className='text-center p-3'>Txs</th><th className='text-right p-3'>Time</th></tr>
            </thead>
            <tbody className='divide-y divide-white/10 font-mono text-xs'>
              {blocks.length === 0 ? (
                <tr><td colSpan={5} className='p-4 text-center text-white/50'>загрузка...</td></tr>
              ) : blocks.map(b => (
                <tr key={b.height} className='hover:bg-white/5'>
                  <td className='p-3 text-emerald-300'>{b.height}</td>
                  <td className='p-3 text-white/80'>{shortHex(b.hash)}</td>
                  <td className='p-3 text-white/60'>{shortHex(b.proposer)}</td>
                  <td className='p-3 text-center'>{b.txCount > 0 ? <span className='text-emerald-300'>{b.txCount}</span> : <span className='text-white/30'>0</span>}</td>
                  <td className='p-3 text-right text-white/40'>{b.time ? new Date(b.time).toLocaleTimeString('ru-RU') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className='text-2xl font-semibold mt-12 mb-4'>Валидаторы</h2>
        <div className='rounded-2xl border border-white/10 overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-white/5 text-white/60 text-xs uppercase'>
              <tr><th className='text-left p-3'>Moniker</th><th className='text-left p-3'>Operator</th><th className='text-right p-3'>Stake</th><th className='text-right p-3'>Commission</th><th className='text-center p-3'>Status</th></tr>
            </thead>
            <tbody className='divide-y divide-white/10 font-mono text-xs'>
              {validators.length === 0 ? (
                <tr><td colSpan={5} className='p-4 text-center text-white/50'>нет валидаторов</td></tr>
              ) : validators.map(v => (
                <tr key={v.operatorAddress} className='hover:bg-white/5'>
                  <td className='p-3 text-white sans'>{v.moniker}</td>
                  <td className='p-3 text-white/70'>{shortHex(v.operatorAddress, 12)}</td>
                  <td className='p-3 text-right'>{formatRZM(parseInt(v.tokens) / 1e9)} RZM</td>
                  <td className='p-3 text-right'>{(parseFloat(v.commission) * 100).toFixed(1)}%</td>
                  <td className='p-3 text-center'>{v.jailed ? <span className='text-red-400'>jailed</span> : <span className='text-emerald-400'>active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className='text-2xl font-semibold mt-12 mb-4'>Public endpoints</h2>
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

        <p className='text-xs text-white/40 mt-12'>
          {status?.latestBlockTime ? `Последний блок: ${new Date(status.latestBlockTime).toISOString()}` : ''}
        </p>
      </section>
    </div>
  )
}
