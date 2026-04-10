import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Читаем скрипт из файла miner-node/docker-install.sh
    const scriptPath = join(process.cwd(), '..', 'miner-node', 'docker-install.sh')
    const script = readFileSync(scriptPath, 'utf-8')

    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline; filename="docker-install.sh"',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    // Fallback — отдаём минимальный скрипт-редирект
    const fallback = `#!/bin/bash
echo "Ошибка: скрипт временно недоступен"
echo "Скачайте вручную: https://github.com/the-razum/razum/tree/main/miner-node"
exit 1
`
    return new NextResponse(fallback, {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
