import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const script = readFileSync(join(process.cwd(), 'public', 'mesh-setup.sh'), 'utf-8')
  return new NextResponse(script, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
