import { MetadataRoute } from 'next'

const BASE = 'https://airazum.com'
const NOW = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { url: '/', priority: 1.0, changeFrequency: 'daily' as const },
    { url: '/chat', priority: 0.9, changeFrequency: 'daily' as const },
    { url: '/agents', priority: 0.8, changeFrequency: 'daily' as const },
    { url: '/agents/new', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/miner', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/pricing', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/chain', priority: 0.7, changeFrequency: 'always' as const },
    { url: '/faucet', priority: 0.6, changeFrequency: 'weekly' as const },
    { url: '/docs', priority: 0.7, changeFrequency: 'weekly' as const },
    { url: '/faq', priority: 0.7, changeFrequency: 'weekly' as const },
    { url: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/roadmap', priority: 0.6, changeFrequency: 'weekly' as const },
    { url: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { url: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { url: '/login', priority: 0.4, changeFrequency: 'yearly' as const },
    { url: '/register', priority: 0.5, changeFrequency: 'yearly' as const },
  ]
  return pages.map(p => ({
    url: BASE + p.url,
    lastModified: NOW,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
