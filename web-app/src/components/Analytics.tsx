'use client'
import { useEffect } from 'react'

export default function Analytics() {
  useEffect(() => {
    const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
    if (!ymId || ymId === 'PLACEHOLDER') return
    if ((window as any).ym) return  // already initialised

    // Yandex.Metrika tag (official snippet, minified)
    ;(function(m: any, e: any, t: any, r: any, i: any, k: any, a: any) {
      m[i] = m[i] || function() { (m[i].a = m[i].a || []).push(arguments) }
      m[i].l = (new Date() as any) * 1
      ;(k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a))
    })(window as any, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym', undefined, undefined)
    ;(window as any).ym(parseInt(ymId, 10), 'init', {
      clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false,
    })
  }, [])
  return null
}
