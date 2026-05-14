import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const exec = promisify(execFile)

const HOME = '/opt/razum-chain/data'
const CHAIN_ID = 'razum-testnet-1'
const FAUCET_KEY = 'validator'
const AMOUNT_NRAZUM = '100000000000'   // 100 RZM
const COOLDOWN_MS = 60 * 60 * 1000     // 1h per IP / address

// In-memory rate-limit (resets on restart — fine for testnet)
const lastByIp = new Map<string, number>()
const lastByAddr = new Map<string, number>()

function isRazumAddr(a: string) {
  return /^razum1[02-9ac-hj-np-z]{38}$/.test(a)
}

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad-json' }, { status: 400 }) }
  const addr = (body?.address || '').trim()
  if (!addr || !isRazumAddr(addr)) {
    return NextResponse.json({ error: 'invalid-address', hint: 'expected razum1...' }, { status: 400 })
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  const now = Date.now()
  const ipLast  = lastByIp.get(ip) ?? 0
  const adLast  = lastByAddr.get(addr) ?? 0
  if (now - ipLast < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - ipLast)) / 60000)
    return NextResponse.json({ error: 'ratelimit', scope: 'ip', waitMinutes: wait }, { status: 429 })
  }
  if (now - adLast < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - adLast)) / 60000)
    return NextResponse.json({ error: 'ratelimit', scope: 'address', waitMinutes: wait }, { status: 429 })
  }

  try {
    const args = [
      'tx', 'bank', 'send',
      FAUCET_KEY,
      addr,
      AMOUNT_NRAZUM + 'nrazum',
      '--keyring-backend', 'test',
      '--home', HOME,
      '--chain-id', CHAIN_ID,
      '--gas', 'auto', '--gas-adjustment', '1.4',
      '--gas-prices', '0nrazum',
      '--output', 'json',
      '--yes',
    ]
    const { stdout } = await exec('/usr/local/bin/inferenced', args, { timeout: 25_000 })
    // CLI prints multi-line; first JSON object should contain txhash
    let txhash: string | null = null
    let code: number | null = null
    for (const line of stdout.split('\n')) {
      const t = line.trim()
      if (t.startsWith('{') && t.endsWith('}')) {
        try {
          const j = JSON.parse(t)
          if (j.txhash) { txhash = j.txhash; code = j.code ?? 0; break }
        } catch {}
      }
    }
    if (!txhash) {
      return NextResponse.json({ error: 'broadcast-failed', stdout: stdout.slice(0, 500) }, { status: 500 })
    }
    if (code !== 0) {
      return NextResponse.json({ error: 'tx-rejected', code, txhash }, { status: 500 })
    }
    lastByIp.set(ip, now)
    lastByAddr.set(addr, now)
    return NextResponse.json({
      ok: true,
      txhash,
      amount: '100 RZM',
      address: addr,
      explorerHint: `https://airazum.com/chain-rpc/tx?hash=0x${txhash}`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'exec-failed', message: process.env.NODE_ENV === 'production' ? undefined : String(e?.stderr || e?.message || e).slice(0, 500) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    chain: CHAIN_ID,
    drip: '100 RZM (= 1e11 nrazum)',
    cooldown: '1 hour per IP and per address',
    method: 'POST { "address": "razum1..." }',
  })
}
