import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Razum AI — Свободный AI',
  description: 'AI-ассистент с поиском в интернете. DeepSeek R1. Без VPN. Без цензуры. Оплата картой МИР и СБП.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://airazum.com'),
  openGraph: {
    title: 'Razum AI — AI-вычисления, которые принадлежат всем',
    description: '80% качества ChatGPT за 490₽ вместо 1800₽. Без VPN. Без цензуры. Работает на тысячах GPU по всему миру.',
    url: 'https://airazum.com',
    siteName: 'Razum AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Razum AI — Децентрализованная GPU-сеть',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Razum AI — AI-вычисления, которые принадлежат всем',
    description: '80% качества ChatGPT за 490₽. Без VPN. Оплата МИР/СБП. Децентрализованная GPU-сеть.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Razum AI',
  },
  keywords: ['AI', 'искусственный интеллект', 'ChatGPT альтернатива', 'DeepSeek', 'без VPN', 'Россия', 'GPU', 'майнинг', 'децентрализация'],
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#00e59b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {})
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
