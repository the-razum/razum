/**
 * Razum-chain client (REST + RPC) — no SDK, just fetch.
 *
 * RPC:  https://airazum.com/chain-rpc/
 * REST: https://airazum.com/chain-api/
 */

const RPC = process.env.RAZUM_CHAIN_RPC || 'http://127.0.0.1:26657'
const REST = process.env.RAZUM_CHAIN_REST || 'http://127.0.0.1:1317'
const CHAIN_ID = process.env.RAZUM_CHAIN_ID || 'razum-testnet-1'
const BASE_DENOM = 'nrazum'

export interface ChainStatus {
  chainId: string
  height: number
  catchingUp: boolean
  latestBlockTime: string
  validatorAddress: string
  rpcUrl: string
  restUrl: string
}

export interface ChainSupply {
  denom: string
  amount: string  // base-denom
  rzm: number     // human RZM (10^9 base)
}

async function fetchJSON<T>(url: string, timeoutMs = 5000): Promise<T> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: c.signal, cache: 'no-store' })
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
    return await r.json() as T
  } finally { clearTimeout(t) }
}

export async function getChainStatus(): Promise<ChainStatus | null> {
  try {
    const j: any = await fetchJSON(`${RPC}/status`)
    const r = j.result
    return {
      chainId: r.node_info.network,
      height: parseInt(r.sync_info.latest_block_height, 10),
      catchingUp: !!r.sync_info.catching_up,
      latestBlockTime: r.sync_info.latest_block_time,
      validatorAddress: r.validator_info.address,
      rpcUrl: 'https://airazum.com/chain-rpc/',
      restUrl: 'https://airazum.com/chain-api/',
    }
  } catch (e) {
    console.error('[chain] getChainStatus error:', (e as Error).message)
    return null
  }
}

export async function getTotalSupply(): Promise<ChainSupply | null> {
  try {
    const j: any = await fetchJSON(`${REST}/cosmos/bank/v1beta1/supply/by_denom?denom=${BASE_DENOM}`)
    const a = BigInt(j.amount?.amount ?? '0')
    return {
      denom: BASE_DENOM,
      amount: a.toString(),
      rzm: Number(a) / 1e9,
    }
  } catch (e) {
    console.error('[chain] getTotalSupply error:', (e as Error).message)
    return null
  }
}

export async function getValidatorCount(): Promise<number | null> {
  try {
    const j: any = await fetchJSON(`${REST}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED`)
    return (j.validators ?? []).length
  } catch (e) {
    console.error('[chain] getValidatorCount error:', (e as Error).message)
    return null
  }
}

export async function getBalance(addr: string): Promise<ChainSupply | null> {
  try {
    const j: any = await fetchJSON(`${REST}/cosmos/bank/v1beta1/balances/${addr}/by_denom?denom=${BASE_DENOM}`)
    const a = BigInt(j.balance?.amount ?? '0')
    return { denom: BASE_DENOM, amount: a.toString(), rzm: Number(a) / 1e9 }
  } catch (e) {
    console.error('[chain] getBalance error:', (e as Error).message)
    return null
  }
}

export const CHAIN_INFO = {
  chainId: CHAIN_ID,
  baseDenom: BASE_DENOM,
  decimals: 9,
  rpcPublic:  'https://airazum.com/chain-rpc/',
  restPublic: 'https://airazum.com/chain-api/',
}
