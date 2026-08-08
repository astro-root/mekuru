import type { MetadataRoute } from 'next'

const BASE_URL = 'https://mekuru.astro-root.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/changelog`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
