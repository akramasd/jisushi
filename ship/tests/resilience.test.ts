import { test, describe, mock } from 'node:test'
import assert from 'node:assert/strict'
import { postJson, newIdempotencyKey, networkMessage, TimeoutError, OfflineError } from '../lib/net.ts'
import { rateLimit } from '../lib/rate-limit.ts'

/**
 * Stands in for the network so failures are scripted, not hoped for.
 *
 * Note: `Object.assign(fn, { get calls() {…} })` does NOT work here — assign
 * copies a getter's current *value*, so the counter would read 0 forever and
 * every assertion below would pass vacuously. The counter is a plain property
 * on a wrapper object instead.
 */
function fakeFetch(script: (attempt: number) => Promise<Response> | Response) {
  const state = { calls: 0 }
  const fn = async (_url: string, init: RequestInit) => {
    state.calls++
    if (init?.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    return script(state.calls)
  }
  return { fn, state }
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('idempotency keys', () => {
  test('are unique across many calls', () => {
    const keys = new Set(Array.from({ length: 5000 }, newIdempotencyKey))
    assert.equal(keys.size, 5000, 'a collision would merge two real orders into one')
  })
})

describe('a dropped connection must not create two orders', () => {
  test('every retry of one attempt carries the SAME key', async () => {
    const seen: string[] = []
    globalThis.fetch = (async (_u: string, init: RequestInit) => {
      seen.push(JSON.parse(String(init.body)).idempotencyKey)
      return seen.length < 3 ? json({ ok: false }, 503) : json({ ok: true, orderNo: 41 })
    }) as typeof fetch

    const key = newIdempotencyKey()
    const res = await postJson<{ ok: boolean; orderNo: number }>(
      '/api/checkout', { idempotencyKey: key }, { retries: 3 },
    )
    assert.equal(res.ok, true)
    assert.equal(seen.length, 3, 'expected two failures then a success')
    assert.equal(new Set(seen).size, 1, 'a retry sent a NEW key — that is a duplicate order')
    assert.equal(seen[0], key)
  })
})

describe('what is safe to retry', () => {
  test('5xx is retried — the server may recover', async () => {
    const { fn, state } = fakeFetch((n) => (n < 3 ? json({}, 500) : json({ ok: true })))
    globalThis.fetch = fn as unknown as typeof fetch
    await postJson('/x', {}, { retries: 3, backoffMs: 5 })
    assert.equal(state.calls, 3)
  })

  test('429 is retried — it is a "wait", not a "no"', async () => {
    const { fn, state } = fakeFetch((n) => (n < 2 ? json({}, 429) : json({ ok: true })))
    globalThis.fetch = fn as unknown as typeof fetch
    await postJson('/x', {}, { retries: 2, backoffMs: 5 })
    assert.equal(state.calls, 2)
  })

  test('400 is NOT retried — repeating a rejected order changes nothing', async () => {
    const { fn, state } = fakeFetch(() => json({ ok: false, error: 'Din kurv er tom.' }, 400))
    globalThis.fetch = fn as unknown as typeof fetch
    const res = await postJson<{ ok: boolean }>('/x', {}, { retries: 3, backoffMs: 5 })
    assert.equal(res.ok, false)
    assert.equal(state.calls, 1, 'a 400 was retried, wasting the customer\'s patience')
  })

  test('409 sold-out is NOT retried', async () => {
    const { fn, state } = fakeFetch(() => json({ ok: false, error: 'Udsolgt' }, 409))
    globalThis.fetch = fn as unknown as typeof fetch
    await postJson('/x', {}, { retries: 3, backoffMs: 5 })
    assert.equal(state.calls, 1)
  })

  test('gives up rather than retrying forever', async () => {
    const { fn, state } = fakeFetch(() => json({}, 500))
    globalThis.fetch = fn as unknown as typeof fetch
    await assert.rejects(() => postJson('/x', {}, { retries: 2, backoffMs: 5 }))
    assert.equal(state.calls, 3, 'initial attempt plus two retries')
  })
})

describe('a hanging connection', () => {
  test('aborts at the deadline instead of hanging forever', async () => {
    // A dead cell does not refuse the connection — it never answers.
    globalThis.fetch = ((_u: string, init: RequestInit) =>
      new Promise((_res, rej) => {
        init.signal?.addEventListener('abort', () =>
          rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))
      })) as typeof fetch

    const started = Date.now()
    await assert.rejects(
      () => postJson('/x', {}, { timeoutMs: 120, retries: 0 }),
      (e: unknown) => e instanceof TimeoutError,
    )
    assert.ok(Date.now() - started < 2000, 'it hung past its own deadline')
  })

  test('the timeout message tells the customer retrying is safe', () => {
    // It has to say this, because it is true — and because the alternative is
    // a customer who force-quits and orders again.
    assert.match(networkMessage(new TimeoutError()), /ikke to gange/)
  })

  test('offline is named as offline, not as a mystery', () => {
    assert.match(networkMessage(new OfflineError()), /offline/i)
  })
})

describe('rate limiting', () => {
  test('allows a normal burst, refuses a flood', () => {
    const key = `t-${Math.random()}`
    for (let i = 0; i < 8; i++) {
      assert.equal(rateLimit(key, { limit: 8, windowMs: 60_000 }).ok, true, `blocked at ${i + 1}`)
    }
    const blocked = rateLimit(key, { limit: 8, windowMs: 60_000 })
    assert.equal(blocked.ok, false)
    assert.ok(blocked.retryAfterSec > 0, 'must tell the caller when to come back')
  })

  test('one customer cannot exhaust another customer\'s allowance', () => {
    const a = `a-${Math.random()}`, b = `b-${Math.random()}`
    for (let i = 0; i < 8; i++) rateLimit(a, { limit: 8, windowMs: 60_000 })
    assert.equal(rateLimit(a, { limit: 8, windowMs: 60_000 }).ok, false)
    assert.equal(rateLimit(b, { limit: 8, windowMs: 60_000 }).ok, true)
  })

  test('the window reopens', async () => {
    const key = `w-${Math.random()}`
    rateLimit(key, { limit: 1, windowMs: 40 })
    assert.equal(rateLimit(key, { limit: 1, windowMs: 40 }).ok, false)
    await new Promise((r) => setTimeout(r, 60))
    assert.equal(rateLimit(key, { limit: 1, windowMs: 40 }).ok, true)
  })
})
