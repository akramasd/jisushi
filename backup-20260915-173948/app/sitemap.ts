import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/** Public pages only — staff routes are deliberately absent. */
const ROUTES = [
  { path: '', priority: 1.0 },
  { path: '/menu', priority: 0.9 },
  { path: '/takeaway', priority: 0.9 },
  { path: '/menukort', priority: 0.8 },
  { path: '/super-tilbud', priority: 0.8 },
  { path: '/booking', priority: 0.7 },
  { path: '/kontakt', priority: 0.7 },
  { path: '/om-os', priority: 0.6 },
  { path: '/billeder', priority: 0.5 },
  { path: '/vinmenu', priority: 0.7 },
  { path: '/jobs', priority: 0.4 },
  { path: '/retningslinjer', priority: 0.3 },
  { path: '/privatlivspolitik', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: r.priority,
  }))
}
