/**
 * Per-IP sliding-window rate limit.
 *
 * In-memory, so the window is per serverless instance rather than global. That
 * is a real limitation and worth naming: it will not stop a distributed flood.
 * It does stop the realistic case — one person hammering "Send bestilling", or
 * a script pointed at the checkout endpoint filling the kitchen screen with
 * junk during service. For a stronger guarantee, back this with Upstash Redis;
 * the interface below is deliberately the same shape.
 */

type Hit = { count: number; resetAt: number }
const buckets = new Map<string, Hit>()

/** Keep the map from growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 500) return
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  sweep(now)

  const hit = buckets.get(key)
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }

  hit.count += 1
  if (hit.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfterSec: 0 }
}

/**
 * Best-effort client IP. Vercel and Netlify both set x-forwarded-for; the first
 * entry is the client, the rest are proxies. Falls back to a constant, which
 * makes the limit global rather than per-IP — degraded, not disabled.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
