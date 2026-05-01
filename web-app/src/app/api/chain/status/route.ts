import { NextResponse } from 'next/server'
import { getChainStatus, getTotalSupply, getValidatorCount, CHAIN_INFO } from '@/lib/chain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const [status, supply, validators] = await Promise.all([
    getChainStatus(),
    getTotalSupply(),
    getValidatorCount(),
  ])
  return NextResponse.json({
    chain: CHAIN_INFO,
    status,
    supply,
    validatorCount: validators,
  }, { headers: { 'Cache-Control': 'public, max-age=5' } })
}
