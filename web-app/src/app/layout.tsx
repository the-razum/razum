import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BetaBanner from '@/components/BetaBanner'
import ThemeToggle from '@/components/ThemeToggle'
import Analytics from '@/components/Analytics'
import CookieBanner from '@/components/CookieBanner'
import Footer from '@/components/Footer'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Razum AI — Умный AI-ассистент. Qwen 3.5 и DeepSeek R1',
    template: '%s | Razum AI',
  },
  description: 'AI-ассистент на базе Qwen 3.5 и DeepSeek R1 за 490₽/мес. Без VPN из России. Оплата картой. Децентрализованная GPU-сеть.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://airazum.com'),
  alternates: {
    canonical: 'https://airazum.com',
  },
  openGraph: {
    title: 'Razum AI — Умный AI-ассистент',
    description: 'AI-ассистент на Qwen 3.5 и DeepSeek R1 за 490₽/мес. Без VPN из России. Оплата картой.',
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
    title: 'Razum AI — Умный AI-ассистент',
    description: 'AI на Qwen 3.5 и DeepSeek R1 за 490₽/мес. Без VPN. Оплата картой.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Razum AI',
  },
  keywords: [
    'AI', 'искусственный интеллект', 'ChatGPT альтернатива', 'Qwen 3.5', 'DeepSeek R1', 'Qwen',
    'без VPN', 'Россия', 'нейросеть', 'AI чат', 'AI ассистент',
    'GPU майнинг', 'децентрализация', 'оплата МИР', 'СБП',
    'AI ассистент на русском', 'DeepSeek', 'Razum AI',
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

// Yandex.Metrika counter ID (set via NEXT_PUBLIC_YM_ID env var)
const YM_ID = process.env.NEXT_PUBLIC_YM_ID || ''

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Analytics />
        <CookieBanner />
        <BetaBanner />
        <div style={{position:'fixed',top:8,right:8,zIndex:9999}}><ThemeToggle /></div>
        {children}
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {})
              }
            `,
          }}
        />
        {/* Yandex.Metrika */}
        {YM_ID && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                  m[i].l=1*new Date();
                  for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
                  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                  (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
                  ym(${YM_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
                `,
              }}
            />
            <noscript>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
              </div>
            </noscript>
          </>
        )}
      </body>
    </html>
  )
}
