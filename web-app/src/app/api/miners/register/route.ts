import { NextRequest, NextResponse } from 'next/server'
import { registerMiner } from '@/lib/db'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)

    // Rate limit: 3 miner registrations per IP per hour
    const limit = checkRateLimit({
      store: 'miner-register', key: ip, maxAttempts: 3, windowMs: 60 * 60 * 1000,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many registrations. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      )
    }

    const text = await req.text()
    if (text.length > 10000) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }

    const { name, walletAddress, gpuModel, vram, models, publicKey } = JSON.parse(text)

    // Validate required fields
    if (!name || !walletAddress) {
      return NextResponse.json({ error: 'name and walletAddress are required' }, { status: 400 })
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 64) {
      return NextResponse.json({ error: 'Name must be 2-64 characters' }, { status: 400 })
    }

    // Validate wallet address (Ethereum format)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: 'Invalid Ethereum wallet address' }, { status: 400 })
    }

    // Validate GPU model string
    if (gpuModel && (typeof gpuModel !== 'string' || gpuModel.length > 128)) {
      return NextResponse.json({ error: 'GPU model string too long' }, { status: 400 })
    }

    // Validate VRAM
    const vramVal = Number(vram) || 0
    if (vramVal < 0 || vramVal > 1000) {
      return NextResponse.json({ error: 'Invalid VRAM value' }, { status: 400 })
    }

    // Validate models array
    const modelsList = Array.isArray(models) ? models.slice(0, 10).filter((m: any) => typeof m === 'string' && m.length < 64) : ['qwen3.5:9b']

    const miner = registerMiner(
      name.trim().slice(0, 64),
      walletAddress,
      (gpuModel || 'Unknown GPU').slice(0, 128),
      vramVal,
      modelsList
    )

    // Save ECDSA public key if provided
    if (publicKey && typeof publicKey === 'string' && publicKey.includes('BEGIN PUBLIC KEY')) {
      try {
        const { updateMinerPublicKey } = await import('@/lib/db')
        updateMinerPublicKey(miner.id, publicKey)
        console.log('[Miner] Public key registered for ' + miner.id.slice(0, 8))
      } catch (e) {
        console.error('[Miner] Failed to save public key:', e)
      }
    }

    console.log(`[Miner] Registered: ${miner.name} wallet=${walletAddress.slice(0, 10)}... ip=${ip} ecdsa=${!!publicKey}`)

    return NextResponse.json({
      success: true,
      miner: {
        id: miner.id,
        name: miner.name,
        apiKey: miner.apiKey,
        walletAddress: miner.walletAddress,
      },
      message: 'Miner registered. Save your API key — it will not be shown again.',
    })
  } catch (e) {
    console.error('[Miner] Register error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
