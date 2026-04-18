import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserById, generateUserApiKey, revokeUserApiKey } from '@/lib/db'

// POST /api/account/api-key — Generate new API key
export async function POST(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const user = getUserById(userId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const apiKey = generateUserApiKey(userId)

  return NextResponse.json({
    apiKey,
    message: 'API key generated. Save it securely.',
    usage: {
      baseUrl: 'https://airazum.com/api/v1',
      models: 'https://airazum.com/api/v1/models',
    },
  })
}

// DELETE /api/account/api-key — Revoke API key
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('razum_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = verifyToken(token)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  revokeUserApiKey(userId)
  return NextResponse.json({ ok: true, message: 'API key revoked' })
}
