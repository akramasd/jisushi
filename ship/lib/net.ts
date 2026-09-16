/**
 * Network helpers for a customer on mobile data.
 *
 * The default `fetch` has no timeout. On a phone that has drifted onto a dead
 * cell, it does not fail — it hangs, indefinitely, while the button reads
 * "Sender…". The customer eventually force-quits and re-orders, and the
 * kitchen gets two of everything. So: a hard deadline, bounded retries, and
 * an idempotency key that makes those retries safe to send.
 */

/** One key per checkout ATTEMPT, reused across retries of that attempt. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export class TimeoutError extends Error {}
export class OfflineError extends Error {}

type PostOpts = {
  timeoutMs?: number
  retries?: number
  /** Base backoff, multiplied by the attempt number. Configurable so a test
   *  suite need not spend real seconds proving the retry logic. */
  backoffMs?: number
  onRetry?: (attempt: number) => void
}

/**
 * POSTs JSON with a deadline and bounded retries.
 *
 * Retries only what is safe to retry: network failures, timeouts, and 5xx/429.
 * A 400 or 409 is the server saying "this order is wrong", and repeating it
 * changes nothing except the customer's patience.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  { timeoutMs = 12_000, retries = 2, backoffMs = 800, onRetry }: PostOpts = {},
): Promise<T> {
  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      onRetry?.(attempt)
      // Back off, but stay inside the span of someone's attention.
      await new Promise((r) => setTimeout(r, backoffMs * attempt))
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      lastErr = new OfflineError()
      continue
    }

    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
        cache: 'no-store',
      })

      // Retry the server's "try again" answers; surface its "no" answers.
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(String(res.status))
        continue
      }
      return (await res.json()) as T
    } catch (e) {
      lastErr = (e as Error)?.name === 'AbortError' ? new TimeoutError() : e
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastErr ?? new Error('network')
}

/** Human wording for the three failures a customer can actually act on. */
export function networkMessage(e: unknown): string {
  if (e instanceof OfflineError) return 'Du er offline. Tjek din forbindelse og prøv igen.'
  if (e instanceof TimeoutError)
    return 'Forbindelsen er langsom. Din bestilling er måske allerede modtaget — tryk igen, vi opretter den ikke to gange.'
  return 'Kunne ikke få forbindelse. Prøv igen, eller ring til os.'
}
