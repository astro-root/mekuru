import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/decks', '/history', '/search', '/settings', '/struggling', '/review', '/admin'],
    },
    sitemap: 'https://mekuru.astro-root.com/sitemap.xml',
  }
}
