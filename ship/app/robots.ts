import type { MetadataRoute } from 'next'
import { SITE_URL, IS_DEMO_BUILD } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  // Demo-preview må aldrig crawles eller forveksles med live.
  if (IS_DEMO_BUILD) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }
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
