import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-accent text-8xl font-bold mb-4">404</div>
        <h1 className="text-2xl font-bold text-text mb-3">Страница не найдена</h1>
        <p className="text-text2 mb-8">
          Такой страницы не существует. Возможно, она была удалена или вы ошиблись в адресе.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent/90 transition"
          >
            На главную
          </Link>
          <Link
            href="/chat"
            className="px-6 py-3 border border-border text-text font-semibold rounded-lg hover:bg-surface transition"
          >
            Открыть чат
          </Link>
        </div>
      </div>
    </div>
  )
}
