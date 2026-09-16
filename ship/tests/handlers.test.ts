import { test, describe, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { __reset, __table } from './stubs/supabase-js.ts'
import { __setCookies } from './stubs/next-headers.ts'
import { signSession, STAFF_COOKIE } from '../lib/staff-session.ts'

/**
 * Exercises the ACTUAL route handlers — the same files that run in production —
 * with the Next response wrapper and the database driver substituted.
 *
 * Honest about what this is: not an end-to-end test. It does not prove your
 * deployment works. It proves the handler logic does, which unit tests on pure
 * modules cannot reach.
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://stub.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'stub-anon-key'
process.env.STAFF_PIN = '4839'
process.env.STAFF_SESSION_SECRET = 'x'.repeat(40)
// No caching between tests — each one sets its own sms_enabled value.
process.env.SMS_STATE_CACHE_MS = '0'

const { POST: checkout } = await import('../app/api/checkout/route.ts')
const { GET: kitchenGet, PATCH: kitchenPatch } = await import('../app/api/kitchen/orders/route.ts')
const { GET: statusGet } = await import('../app/api/order/[token]/route.ts')

const MENU = [
  { id: 'aaaaaaaa-1111-4111-8111-111111111111', name: 'California (8 stk.)', price: '79.00', is_available: true },
  { id: 'bbbbbbbb-2222-4222-8222-222222222222', name: 'Spicy Laks (8 stk.)', price: '83.00', is_available: true },
  { id: 'cccccccc-3333-4333-8333-333333333333', name: 'Edamame', price: '45.00', is_available: false },
]
const ID = MENU.map((m) => m.id)

/**
 * Mid-afternoon Friday in Copenhagen — comfortably open.
 *
 * Uses node:test's own Date mock rather than hand-patching globalThis.Date.
 * The hand-rolled version silently did nothing, and the suite then failed for
 * the honest reason that the container's clock said 23:30 on a Tuesday and the
 * restaurant was shut. Worth stating: the handler was right, the harness was wrong.
 */
const OPEN = new Date('2026-07-17T13:00:00Z')  // 15:00 CEST, Friday
const CLOSED = new Date('2026-07-17T23:30:00Z') // 01:30 CEST, long shut

function setClock(when: Date) {
  mock.timers.reset()
  mock.timers.enable({ apis: ['Date'], now: when.getTime() })
}

/**
 * A fresh IP per call by default.
 *
 * The rate limiter is module-level state that persists across tests, so a
 * shared IP meant the ninth checkout in the file got a 429 and every later
 * assertion failed with "0 orders" — which looks exactly like a broken handler.
 * The rate-limit test passes an explicit IP because it wants that state.
 */
let ipSeq = 0
const post = (body: unknown, ip = `10.0.${Math.floor(ipSeq / 250) % 250}.${++ipSeq % 250}`) =>
  checkout(new Request('https://jisushi.dk/api/checkout', {
    method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': ip },
  }))
const j = async (r: Response) => ({ status: r.status, body: await r.json() })

const order = (over: Record<string, unknown> = {}) => ({
  items: [{ id: ID[0], qty: 2 }],
  name: 'Zsofia Qvist',   // deliberately unlike any menu word
  phone: '31 33 44 86',
  pickupMinutes: 30,
  idempotencyKey: `k-${Math.random().toString(36).slice(2)}`,
  ...over,
})

beforeEach(() => {
  __reset({ menu_items: MENU, settings: [{ id: 'main', webhook_url: null }] })
  setClock(OPEN)
})

after(() => mock.timers.reset())

describe('checkout handler — the real route', () => {
  test('creates an order and prices it from the database', async () => {
    const { status, body } = await j(await post(order()))
    assert.equal(status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.total, 158, '2 x 79 priced server-side')
    assert.equal(body.token?.length, 32)
    assert.equal(__table('orders').length, 1)
  })

  test('a NUMERIC price arriving as a string still totals correctly', async () => {
    // PostgREST really does serialise NUMERIC as a string.
    const { body } = await j(await post(order({ items: [{ id: ID[1], qty: 3 }] })))
    assert.equal(body.total, 249)
  })

  test('the phone is stored normalised so history search can find it', async () => {
    await post(order())
    const row = __table('orders')[0]
    assert.equal(row.phone_digits, '31334486')
  })

  test('a client-supplied price is ignored', async () => {
    const { body } = await j(await post(order({
      items: [{ id: ID[0], qty: 1, price: 1, name: 'gratis' }],
    })))
    assert.equal(body.total, 79)
    assert.equal(__table('orders')[0].items[0].name, 'California (8 stk.)')
  })

  test('a sold-out item blocks the order', async () => {
    const { status, body } = await j(await post(order({ items: [{ id: ID[2], qty: 1 }] })))
    assert.equal(status, 409)
    assert.match(body.error, /udsolgt/i)
  })

  test('duplicate lines merge and respect the ceiling', async () => {
    const items = Array.from({ length: 20 }, () => ({ id: ID[0], qty: 99 }))
    const { body } = await j(await post(order({ items })))
    assert.equal(body.total, 79 * 99, 'the clamp was multiplied by repeating the line')
  })
})

describe('the mobile-data case', () => {
  test('REPLAY: the same key returns the same order, never a second one', async () => {
    const payload = order()
    const first = await j(await post(payload))
    const retry = await j(await post(payload))

    assert.equal(retry.body.ok, true)
    assert.equal(retry.body.replay, true)
    assert.equal(retry.body.orderNo, first.body.orderNo)
    assert.equal(retry.body.token, first.body.token)
    assert.equal(__table('orders').length, 1, 'a duplicate order reached the kitchen')
  })

  test('RACE: concurrent retries of one attempt yield one order', async () => {
    const payload = order()
    const all = await Promise.all([post(payload), post(payload), post(payload), post(payload)])
    const bodies = await Promise.all(all.map((r) => r.json()))

    assert.equal(__table('orders').length, 1, `${__table('orders').length} orders created`)
    const nos = new Set(bodies.filter((b) => b.ok).map((b) => b.orderNo))
    assert.equal(nos.size, 1, 'racing retries produced different order numbers')
  })

  test('a retry sent AFTER closing time still returns the original order', async () => {
    const payload = order()
    const first = await j(await post(payload))
    assert.equal(first.body.ok, true)

    setClock(CLOSED)
    const late = await j(await post(payload))
    assert.equal(late.body.ok, true, 'the replay check must run before the hours check')
    assert.equal(late.body.orderNo, first.body.orderNo)
  })

  test('a NEW order after closing is still refused', async () => {
    setClock(CLOSED)
    const { status, body } = await j(await post(order()))
    assert.equal(status, 409)
    assert.equal(body.closed, true)
  })
})

describe('checkout rejects tampering', () => {
  for (const [label, over, expect] of [
    ['empty cart', { items: [] }, 400],
    ['short phone', { phone: '123' }, 400],
    ['missing name', { name: '' }, 400],
    ['no idempotency key', { idempotencyKey: '' }, 400],
    ['unknown item', { items: [{ id: 'ffffffff-0000-4000-8000-000000000000', qty: 1 }] }, 409],
    ['negative qty', { items: [{ id: ID[0], qty: -4 }] }, 400],
    ['NaN qty', { items: [{ id: ID[0], qty: 'x' }] }, 400],
  ] as const) {
    test(`${label} → ${expect}`, async () => {
      const { status } = await j(await post(order(over as Record<string, unknown>)))
      assert.equal(status, expect)
      assert.equal(__table('orders').length, 0, `${label} created an order`)
    })
  }

  test('pickup window is clamped to an offered value', async () => {
    await post(order({ pickupMinutes: -999 }))
    assert.equal(__table('orders')[0].pickup_minutes, 30)
  })
})

describe('rate limiting the real endpoint', () => {
  test('a burst from one IP is cut off', async () => {
    const ip = `10.9.${Math.floor(Math.random() * 250)}.1`
    let blocked = 0
    for (let i = 0; i < 14; i++) {
      const r = await post(order(), ip)
      if (r.status === 429) blocked++
    }
    assert.ok(blocked > 0, 'no 429 after 14 requests from one IP')
  })
})

describe('kitchen handler — the real route', () => {
  let cookie: string
  before(async () => { cookie = (await signSession())! })

  const signedIn = () => __setCookies({ [STAFF_COOKIE]: cookie })
  const signedOut = () => __setCookies({})

  test('refuses an unauthenticated read', async () => {
    signedOut()
    const r = await kitchenGet(new Request('https://jisushi.dk/api/kitchen/orders'))
    assert.equal(r.status, 401)
  })

  test('refuses a forged cookie', async () => {
    __setCookies({ [STAFF_COOKIE]: `${Date.now() + 999999}.deadbeef` })
    const r = await kitchenGet(new Request('https://jisushi.dk/api/kitchen/orders'))
    assert.equal(r.status, 401, 'a tampered session was accepted')
  })

  test('an expired session is refused', async () => {
    const expired = await signSession(-1000)
    __setCookies({ [STAFF_COOKIE]: expired! })
    const r = await kitchenGet(new Request('https://jisushi.dk/api/kitchen/orders'))
    assert.equal(r.status, 401)
  })

  test('a new order appears on the pass', async () => {
    const made = await j(await post(order()))
    signedIn()
    const { body } = await j(await kitchenGet(new Request('https://jisushi.dk/api/kitchen/orders?view=active')))
    assert.equal(body.ok, true)
    assert.equal(body.orders.length, 1)
    assert.equal(body.orders[0].order_no, made.body.orderNo)
  })

  test('history search finds the order by phone as the customer typed it', async () => {
    await post(order({ phone: '+45 31 33 44 86' }))
    signedIn()
    const { body } = await j(await kitchenGet(
      new Request('https://jisushi.dk/api/kitchen/orders?view=history&q=31334486')))
    assert.equal(body.orders.length, 1, 'phone search found nothing — the bug that shipped')
  })

  test('history search finds the order by order number', async () => {
    const made = await j(await post(order()))
    signedIn()
    const { body } = await j(await kitchenGet(
      new Request(`https://jisushi.dk/api/kitchen/orders?view=history&q=${made.body.orderNo}`)))
    assert.equal(body.orders.length, 1)
  })
})

describe('the lifecycle, on the real routes', () => {
  let cookie: string
  before(async () => { cookie = (await signSession())! })

  const patch = (body: unknown) => {
    __setCookies({ [STAFF_COOKIE]: cookie })
    return kitchenPatch(new Request('https://jisushi.dk/api/kitchen/orders', {
      method: 'PATCH', body: JSON.stringify(body),
    }))
  }
  const rowId = () => __table('orders')[0].id

  test('pending → accepted → ready → completed', async () => {
    await post(order())
    for (const s of ['accepted', 'ready', 'completed']) {
      const { status } = await j(await patch({ id: rowId(), status: s, etaMinutes: 30 }))
      assert.equal(status, 200, `${s} was refused`)
    }
    assert.equal(__table('orders')[0].status, 'completed')
  })

  test('acceptance cannot be skipped', async () => {
    await post(order())
    const { status } = await j(await patch({ id: rowId(), status: 'completed' }))
    assert.equal(status, 409)
    assert.equal(__table('orders')[0].status, 'pending')
  })

  test('a cancelled order stays cancelled', async () => {
    await post(order())
    await patch({ id: rowId(), status: 'cancelled', reason: 'Udsolgt' })
    const { status } = await j(await patch({ id: rowId(), status: 'accepted' }))
    assert.equal(status, 409)
    assert.equal(__table('orders')[0].status, 'cancelled')
  })

  test('a double-tap of the same button changes state once', async () => {
    await post(order())
    const id = rowId()
    const both = await Promise.all([
      patch({ id, status: 'accepted' }),
      patch({ id, status: 'accepted' }),
    ])
    const bodies = await Promise.all(both.map((r) => r.json()))
    const realChanges = bodies.filter((b) => b.ok && !b.unchanged).length
    // The other call may legitimately answer "already accepted" — that is the
    // right answer to a double-tap, and re-reporting it as an error would train
    // staff to ignore the screen.
    assert.equal(realChanges, 1, `${realChanges} writes actually changed state`)
    assert.equal(__table('orders')[0].status, 'accepted')
  })

  test('two staff tapping mutually exclusive buttons: exactly one wins', async () => {
    // From "ready", collected and cancelled exclude each other in BOTH
    // orderings: completed -> cancelled is illegal, and so is cancelled ->
    // completed. Whichever lands first, the other must be refused — so this
    // holds no matter how the two requests interleave.
    await post(order())
    const id = rowId()
    await patch({ id, status: 'accepted' })
    await patch({ id, status: 'ready' })

    const [done, void_] = await Promise.all([
      patch({ id, status: 'completed' }),
      patch({ id, status: 'cancelled', reason: 'Kunden kom aldrig' }),
    ])
    const bodies = await Promise.all([done.json(), void_.json()])
    const winners = bodies.filter((b) => b.ok && !b.unchanged).length

    assert.equal(winners, 1, 'both mutually exclusive transitions were applied')

    const loser = bodies.find((b) => !b.ok)
    assert.ok(loser, 'no write was refused — the update is not atomic')
    assert.ok(loser.raced || loser.current, 'the loser was not told the real current state')

    const final = __table('orders')[0]
    assert.ok(['completed', 'cancelled'].includes(final.status))
    // Never both: an order cannot be simultaneously collected and voided.
    assert.ok(!(final.completed_at && final.cancelled_at), 'the row records both outcomes')
  })

  test('confirming sets a ready time the customer can see', async () => {
    await post(order())
    await patch({ id: rowId(), status: 'accepted', etaMinutes: 30 })
    assert.ok(__table('orders')[0].ready_estimate, 'no ETA was recorded')
  })
})

describe('the customer status route', () => {
  const get = (token: string) =>
    statusGet(new Request(`https://jisushi.dk/api/order/${token}`, { headers: { 'x-forwarded-for': '10.1.1.1' } }),
      { params: Promise.resolve({ token }) })

  test('finds the order by token', async () => {
    const made = await j(await post(order()))
    const { status, body } = await j(await get(made.body.token))
    assert.equal(status, 200)
    assert.equal(body.order.orderNo, made.body.orderNo)
  })

  test('leaks neither name nor phone', async () => {
    const made = await j(await post(order()))
    const { body } = await j(await get(made.body.token))
    const text = JSON.stringify(body).toLowerCase()
    assert.ok(!text.includes('zsofia') && !text.includes('qvist'), 'the customer name leaked')
    assert.ok(!text.includes('31334486') && !text.includes('31 33 44 86'), 'the phone leaked')
  })

  test('a sequential id is not a valid token', async () => {
    await post(order())
    assert.equal((await get('41')).status, 404)
    assert.equal((await get('1')).status, 404)
  })

  test('an unknown token is 404, not an error', async () => {
    assert.equal((await get('f'.repeat(32))).status, 404)
  })

  test('the customer sees the kitchen confirming', async () => {
    const made = await j(await post(order()))
    __setCookies({ [STAFF_COOKIE]: (await signSession())! })
    await kitchenPatch(new Request('https://x/api/kitchen/orders', {
      method: 'PATCH',
      body: JSON.stringify({ id: __table('orders')[0].id, status: 'accepted', etaMinutes: 30 }),
    }))
    const { body } = await j(await get(made.body.token))
    assert.equal(body.order.status, 'accepted')
    assert.ok(body.order.readyEstimate)
  })
})

describe('SMS is dormant until switched on', () => {
  test('with SMS off, a status change records the message but does not queue it', async () => {
    __reset({
      menu_items: MENU,
      settings: [{ id: 'main', sms_enabled: false, webhook_url: null }],
    })
    setClock(OPEN)

    const made = await j(await post(order()))
    __setCookies({ [STAFF_COOKIE]: (await signSession())! })
    await kitchenPatch(new Request('https://x/api/kitchen/orders', {
      method: 'PATCH',
      body: JSON.stringify({ id: __table('orders')[0].id, status: 'accepted', etaMinutes: 30 }),
    }))

    const queued = __table('outbound_messages') ?? []
    const pending = queued.filter((m: Record<string, unknown>) => m.status === 'pending')
    assert.equal(pending.length, 0,
      'a message was queued while SMS is off — connecting a phone later would flush it')

    // But it IS recorded, so you can read back what would have been sent.
    const skipped = queued.filter((m: Record<string, unknown>) => m.status === 'skipped')
    assert.ok(skipped.length >= 1, 'nothing recorded — no way to verify before going live')
    assert.match(String(skipped[0].skip_reason), /ikke aktiveret/)
    assert.equal(made.body.ok, true)
  })

  test('with SMS on, the same change queues a real message', async () => {
    __reset({
      menu_items: MENU,
      settings: [{ id: 'main', sms_enabled: true, webhook_url: null }],
    })
    setClock(OPEN)

    await post(order())
    __setCookies({ [STAFF_COOKIE]: (await signSession())! })
    const id = __table('orders')[0].id
    // Acceptance cannot be skipped — going straight to 'ready' is refused, which
    // is the lifecycle working, not a bug.
    await kitchenPatch(new Request('https://x/api/kitchen/orders', {
      method: 'PATCH', body: JSON.stringify({ id, status: 'accepted', etaMinutes: 30 }),
    }))
    await kitchenPatch(new Request('https://x/api/kitchen/orders', {
      method: 'PATCH', body: JSON.stringify({ id, status: 'ready' }),
    }))

    const pending = (__table('outbound_messages') ?? [])
      .filter((m: Record<string, unknown>) => m.status === 'pending')

    // Two: one for the confirmation, one for ready. Matching loosely on "klar"
    // caught both, because the confirmation says "forventer den klar kl. …".
    assert.equal(pending.length, 2, 'expected a confirmation and a ready message')
    assert.ok(pending.some((m: Record<string, unknown>) => /bekræftet/i.test(String(m.body))))
    assert.ok(pending.some((m: Record<string, unknown>) => /klar til afhentning/i.test(String(m.body))))
  })

  test('every queued message carries an expiry', async () => {
    __reset({ menu_items: MENU, settings: [{ id: 'main', sms_enabled: true }] })
    setClock(OPEN)

    await post(order())
    __setCookies({ [STAFF_COOKIE]: (await signSession())! })
    const oid = __table('orders')[0].id
    await kitchenPatch(new Request('https://x/api/kitchen/orders', {
      method: 'PATCH', body: JSON.stringify({ id: oid, status: 'accepted', etaMinutes: 30 }),
    }))

    const [msg] = (__table('outbound_messages') ?? [])
      .filter((m: Record<string, unknown>) => m.status === 'pending')
    assert.ok(msg?.expires_at, 'no shelf life — a stale text could still go out')
    // "Ready" is worthless once the food is cold.
    const ttlMin = (new Date(String(msg.expires_at)).getTime() - Date.now()) / 60000
    // 'accepted' is worthless after about an hour — see TTL in lib/messaging.ts
    assert.ok(ttlMin > 0 && ttlMin <= 60, `expiry looks wrong: ${ttlMin} min`)
  })
})

describe('the owner can stop and start orders', () => {
  test('a pause refuses new orders, in the owner\'s own words', async () => {
    __reset({
      menu_items: MENU,
      settings: [{ id: 'main', ordering_paused: true, pause_message: 'Vi er helt fyldt op i aften.' }],
    })
    setClock(OPEN)

    const { status, body } = await j(await post(order()))
    assert.equal(status, 409)
    assert.equal(body.closed, true)
    assert.match(body.error, /fyldt op/)
    assert.equal(__table('orders').length, 0)
  })

  test('a pause with no message still says something useful', async () => {
    __reset({ menu_items: MENU, settings: [{ id: 'main', ordering_paused: true }] })
    setClock(OPEN)
    const { body } = await j(await post(order()))
    assert.match(body.error, /ring/i, 'a customer who cannot order must be given the phone')
  })

  test('unpausing takes orders again', async () => {
    __reset({ menu_items: MENU, settings: [{ id: 'main', ordering_paused: false }] })
    setClock(OPEN)
    const { body } = await j(await post(order()))
    assert.equal(body.ok, true)
  })

  test('the pause is checked BEFORE opening hours', async () => {
    // Otherwise a paused restaurant inside opening hours would tell customers
    // "we close at 21:00" — which reads as a fault, not a decision.
    __reset({ menu_items: MENU, settings: [{ id: 'main', ordering_paused: true, pause_message: 'Fryren er gået.' }] })
    setClock(OPEN)
    const { body } = await j(await post(order()))
    assert.match(body.error, /Fryren/)
  })

  test('an unreadable settings row fails OPEN, not closed', async () => {
    // A pause that fails closed costs every evening; one that fails open costs
    // a busy one. Missing settings must not stop the restaurant trading.
    __reset({ menu_items: MENU, settings: [] })
    setClock(OPEN)
    const { body } = await j(await post(order()))
    assert.equal(body.ok, true, 'no settings row stopped ordering entirely')
  })
})
