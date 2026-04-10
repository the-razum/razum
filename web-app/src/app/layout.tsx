import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Razum AI — AI без границ. Без VPN. DeepSeek R1, Mistral, LLaMA',
    template: '%s | Razum AI',
  },
  description: 'Мощные AI-модели за 490₽/мес. DeepSeek R1, Mistral, LLaMA — без VPN из России. Оплата МИР/СБП. Поиск в интернете. Децентрализованная GPU-сеть.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://airazum.com'),
  alternates: {
    canonical: 'https://airazum.com',
  },
  openGraph: {
    title: 'Razum AI — AI без границ. Без VPN.',
    description: '80% качества ChatGPT за 490₽. DeepSeek R1, Mistral, LLaMA. Без VPN из России. Оплата МИР/СБП. Зарабатывайте RZM-токены на GPU.',
    url: 'https://airazum.com',
    siteName: 'Razum AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Razum AI — Децентрализованная AI-платформа',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Razum AI — AI без границ. Без VPN.',
    description: '80% качества ChatGPT за 490₽. DeepSeek R1. Без VPN из России. Оплата МИР/СБП. Зарабатывайте на GPU.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Razum AI',
  },
  keywords: [
    'AI', 'искусственный интеллект', 'ChatGPT альтернатива', 'DeepSeek R1', 'Mistral', 'LLaMA',
    'без VPN', 'Россия', 'нейросеть', 'AI чат', 'AI ассистент',
    'GPU майнинг', 'децентрализация', 'оплата МИР', 'СБП',
    'AI без цензуры', 'DeepSeek', 'Razum AI',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // google: 'your-google-verification-code',  // TODO: add when ready
    // yandex: 'your-yandex-verification-code',  // TODO: add when ready
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
      <body className={`${inter.variable} font-sans antialiased`}>
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
