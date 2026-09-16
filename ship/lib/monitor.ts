import { serviceClient } from '@/lib/supabase'

/**
 * Records things a human should know about.
 *
 * Two destinations, deliberately: the console (so it lands in Vercel's function
 * logs immediately) and a `system_events` row (so the kitchen can see it on a
 * phone without anyone having a Vercel account).
 *
 * Never throws. Monitoring that can break the thing it monitors is worse than
 * no monitoring — a failed checkout must not become a failed checkout *and* an
 * unhandled exception.
 */

export type Severity = 'info' | 'warn' | 'error'

export async function record(
  severity: Severity,
  source: string,
  message: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  // ── Feeler 1: the console ──
  // Unconditional and first. If the database is the thing that is broken, this
  // is the only record that survives, and it lands in Vercel's logs regardless.
  const line = `[prepnest:${severity}] ${source} — ${message}`
  severity === 'error' ? console.error(line, detail ?? '') : console.warn(line, detail ?? '')

  // ── Feeler 2: the event log ──
  // What the kitchen sees in Systemtjek, on a phone, without a Vercel account.
  let stored = false
  try {
    await serviceClient()
      .from('system_events')
      .insert({ severity, source, message: message.slice(0, 500), detail: detail ?? null })
    stored = true
  } catch {
    // Swallowed. See the contract above.
  }

  if (severity !== 'error') return

  // ── Feeler 3: a text to the owner ──
  // Only for errors, rate-limited to one per hour per kind — an alert that
  // fires forty times during one outage is an alert that gets muted.
  try {
    const { alertOwner } = await import('@/lib/messaging')
    await alertOwner(source, `${source}: ${message}`.slice(0, 200))
  } catch {
    /* messaging is itself best-effort */
  }

  // ── Feeler 4: the kitchen webhook ──
  // The channel that already reaches a phone when the KDS tab is shut. If the
  // database failed to store the event, this is the last line that still works.
  if (!stored) {
    try {
      const url = process.env.SETTINGS_WEBHOOK_FALLBACK_URL
      if (url) {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000),
          body: JSON.stringify({ event: 'system.error', source, message, at: new Date().toISOString() }),
        })
      }
    } catch {
      /* nothing left to try; the console line above is the record */
    }
  }
}

/** Strips anything that should not sit in a log table for 30 days. */
export function safeDetail(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    // Never log the customer's identity, or anything that authenticates.
    if (/name|phone|token|key|secret|pin|cookie|auth/i.test(k)) continue
    out[k] = typeof v === 'string' ? v.slice(0, 200) : v
  }
  return out
}

/** Turns an unknown thrown value into something worth storing. */
export function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`
  return String(e).slice(0, 300)
}
