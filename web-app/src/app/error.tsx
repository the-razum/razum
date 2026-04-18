'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Error Page]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-8xl font-bold mb-4">500</div>
        <h1 className="text-2xl font-bold text-text mb-3">Что-то пошло не так</h1>
        <p className="text-text2 mb-8">
          Произошла ошибка на сервере. Попробуйте обновить страницу или вернуться позже.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent/90 transition"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-border text-text font-semibold rounded-lg hover:bg-surface transition"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
