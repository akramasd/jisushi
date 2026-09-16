import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Staff surfaces. Note this is a request to crawlers, not access control —
      // the actual gate is middleware.ts. Both, not either.
      disallow: ['/kitchen', '/kitchen/', '/admin', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
