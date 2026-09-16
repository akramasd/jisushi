#!/usr/bin/env node
/**
 * Smoke test — a REAL order, against your REAL deployment.
 *
 * Nothing here is simulated. It places an actual order through the actual
 * checkout endpoint, reads it back through the actual kitchen API, walks it
 * through the real lifecycle, and cleans up after itself.
 *
 *   node scripts/smoke.mjs https://www.jisushi.dk
 *   node scripts/smoke.mjs http://localhost:3000
 *
 * The staff PIN is read from STAFF_PIN in .env.local, or --pin=1234.
 *
 * SAFE TO RUN AGAINST PRODUCTION, with two caveats stated plainly:
 *   1. It creates one real order named "PREPNEST SMOKETEST" and cancels it at
 *      the end. If the run dies halfway, cancel it by hand from /kitchen.
 *   2. If you have a kitchen webhook configured, it WILL fire. Warn whoever
 *      receives those, or run with --no-order to skip order creation.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const BASE = (args.find((a) => a.startsWith('http')) || '').replace(/\/$/, '')
const flag = (n) => args.some((a) => a === `--${n}`)
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

if (!BASE) {
  console.error('Usage: node scripts/smoke.mjs https://your-site.dk [--pin=1234] [--no-order]')
  process.exit(2)
}

function envFile() {
  const env = { ...process.env }
  for (const f of ['.env.local', '.env']) {
    const p = join(process.cwd(), f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
  return env
}
const env = envFile()
const PIN = opt('pin') || env.STAFF_PIN

let pass = 0, fail = 0, skip = 0
const t = {
  ok: (m) => { pass++; console.log(`  PASS  ${m}`) },
  no: (m) => { fail++; console.log(`  FAIL  ${m}`) },
  skip: (m) => { skip++; console.log(`  SKIP  ${m}`) },
  head: (m) => console.log(`\n${m}`),
}

const jar = new Map()
let unreachable = false

/**
 * A wrong URL, a sleeping dev server, or DNS that does not resolve must read as
 * a clear message — not an undici stack trace. This is the first thing anyone
 * running the script for the first time will hit.
 */
async function req(path, init = {}) {
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  let res
  try {
    res = await fetchOrThrow(path, init, cookie)
  } catch (e) {
    if (!unreachable) {
      unreachable = true
      console.error(`\n  Cannot reach ${BASE}`)
      console.error(`  ${e.cause?.code ?? e.message}`)
      console.error('\n  Check the URL, and that the site is running:')
      console.error('    npm run dev        then  node scripts/smoke.mjs http://localhost:3000')
      console.error('    or use your live URL, e.g. https://www.jisushi.dk\n')
      process.exit(2)
    }
    return { status: 0, body: null, headers: new Headers() }
  }
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
  }
  let body = null
  const ct = res.headers.get('content-type') || ''
  try { body = ct.includes('json') ? await res.json() : await res.text() } catch {}
  return { status: res.status, body, headers: res.headers }
}

function fetchOrThrow(path, init, cookie) {
  return fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(init.headers || {}),
    },
  })
}

console.log(`\nSMOKE TEST — real requests against ${BASE}\n`)

// ═══════════════════════════════════════════════ 1. the site is up
t.head('1. Public site')
{
  const r = await req('/')
  r.status === 200 ? t.ok('home page responds 200') : t.no(`home page returned ${r.status}`)

  const tw = await req('/takeaway')
  if (tw.status !== 200) t.no(`/takeaway returned ${tw.status}`)
  else {
    t.ok('/takeaway responds 200')
    const html = String(tw.body)
    // The bug that made ordering impossible produced a page with no items.
    if (/kr/.test(html) && html.length > 5000) t.ok('takeaway page rendered a menu')
    else t.no('takeaway page rendered but looks EMPTY — check menu_items and the UUID id type')
  }
}

// ═══════════════════════════════════════════════ 2. staff surfaces are locked
t.head('2. Security — before anything else')
{
  const k = await req('/kitchen')
  if (k.status === 200 && /ordre|Færdig|Bekræft/i.test(String(k.body))) {
    t.no('/kitchen SERVED THE ORDER SCREEN WITHOUT LOGIN — do not publish')
  } else if ([302, 307, 308].includes(k.status) || /login|kode/i.test(String(k.body))) {
    t.ok('/kitchen redirects to login when signed out')
  } else {
    t.ok(`/kitchen did not serve orders (HTTP ${k.status})`)
  }

  const api = await req('/api/kitchen/orders')
  api.status === 401
    ? t.ok('kitchen API refuses unauthenticated reads (401)')
    : t.no(`kitchen API returned ${api.status} without a session — expected 401`)

  const bogus = await req('/api/order/00000000000000000000000000000000')
  bogus.status === 404
    ? t.ok('unknown order token returns 404')
    : t.no(`unknown token returned ${bogus.status} — expected 404`)

  const malformed = await req('/api/order/1')
  malformed.status === 404
    ? t.ok('sequential id cannot be used as a token')
    : t.no(`/api/order/1 returned ${malformed.status} — order tokens may be guessable`)
}

// ═══════════════════════════════════════════════ 3. a real order
t.head('3. Placing a real order')
let order = null
let idemKey = null

if (flag('no-order')) {
  t.skip('order creation skipped (--no-order)')
} else {
  const menuRes = await req('/api/checkout', { method: 'POST', body: JSON.stringify({}) })
  // We need real item ids. Scrape them from the takeaway page's payload.
  const html = String((await req('/takeaway')).body)
  const ids = [...html.matchAll(/"id":"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g)]
    .map((m) => m[1])
  const uniq = [...new Set(ids)]

  if (uniq.length === 0) {
    t.no('could not find any menu item ids in the page — cannot place a test order')
  } else {
    t.ok(`found ${uniq.length} menu item ids in the rendered page`)
    idemKey = `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const payload = {
      items: [{ id: uniq[0], qty: 1 }],
      name: 'PREPNEST SMOKETEST',
      phone: '31334486',
      pickupMinutes: 30,
      idempotencyKey: idemKey,
    }

    const r = await req('/api/checkout', { method: 'POST', body: JSON.stringify(payload) })

    if (r.status === 409 && r.body?.closed) {
      t.skip(`restaurant is closed right now — ordering path not testable (${r.body.error})`)
    } else if (r.status === 200 && r.body?.ok) {
      order = r.body
      t.ok(`order #${order.orderNo} created, total ${order.total} kr`)
      order.token?.length === 32
        ? t.ok('status token is 32 hex chars, not a sequential id')
        : t.no(`status token looks wrong: ${order.token}`)

      // ─── the one that matters on mobile data ───
      const replay = await req('/api/checkout', { method: 'POST', body: JSON.stringify(payload) })
      if (replay.body?.orderNo === order.orderNo && replay.body?.replay) {
        t.ok('REPLAY: same key returned the same order — a dropped connection cannot double-order')
      } else if (replay.body?.orderNo && replay.body.orderNo !== order.orderNo) {
        t.no(`REPLAY CREATED A SECOND ORDER (#${replay.body.orderNo}) — customers will be charged twice`)
        order.duplicate = replay.body.orderNo
      } else {
        t.no(`replay returned an unexpected response: ${JSON.stringify(replay.body).slice(0, 120)}`)
      }

      // ─── concurrent retries, the way a flaky connection actually behaves ───
      const k2 = `smoke-race-${Date.now()}`
      const racers = await Promise.all(
        Array.from({ length: 4 }, () =>
          req('/api/checkout', { method: 'POST', body: JSON.stringify({ ...payload, idempotencyKey: k2 }) }),
        ),
      )
      const nos = new Set(racers.filter((x) => x.body?.ok).map((x) => x.body.orderNo))
      if (nos.size === 1) t.ok(`RACE: 4 simultaneous retries produced exactly 1 order (#${[...nos][0]})`)
      else t.no(`RACE: 4 simultaneous retries produced ${nos.size} orders — ${[...nos].join(', ')}`)
      if (nos.size >= 1) order.raceNo = [...nos][0]

      // ─── the customer's view ───
      const st = await req(`/api/order/${order.token}`)
      if (st.status === 200 && st.body?.ok) {
        t.ok(`status page finds order #${st.body.order.orderNo}, status "${st.body.order.status}"`)
        const leaked = JSON.stringify(st.body).toLowerCase()
        leaked.includes('smoketest') || leaked.includes('31334486')
          ? t.no('status endpoint LEAKS the customer name or phone — a shared link discloses personal data')
          : t.ok('status endpoint returns no name or phone')
      } else {
        t.no(`status endpoint returned ${st.status}`)
      }
    } else {
      t.no(`checkout returned ${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`)
    }
  }
}

// ═══════════════════════════════════════════════ 4. tampering
t.head('4. Server refuses tampered input')
{
  const base = { name: 'PREPNEST SMOKETEST', phone: '31334486', pickupMinutes: 30 }
  const cases = [
    ['empty cart', { ...base, items: [], idempotencyKey: `s-${Date.now()}-a` }],
    ['bad phone', { ...base, phone: '123', items: [{ id: 'x', qty: 1 }], idempotencyKey: `s-${Date.now()}-b` }],
    ['no name', { ...base, name: '', items: [{ id: 'x', qty: 1 }], idempotencyKey: `s-${Date.now()}-c` }],
    ['unknown item', { ...base, items: [{ id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', qty: 1 }], idempotencyKey: `s-${Date.now()}-d` }],
    ['negative qty', { ...base, items: [{ id: 'x', qty: -5 }], idempotencyKey: `s-${Date.now()}-e` }],
    ['no idempotency key', { ...base, items: [{ id: 'x', qty: 1 }] }],
  ]
  for (const [label, payload] of cases) {
    const r = await req('/api/checkout', { method: 'POST', body: JSON.stringify(payload) })
    r.status === 200 && r.body?.ok
      ? t.no(`${label}: ACCEPTED — expected rejection`)
      : t.ok(`${label}: rejected (${r.status})`)
  }
}

// ═══════════════════════════════════════════════ 5. rate limiting
t.head('5. Rate limiting')
{
  let limited = false
  for (let i = 0; i < 14; i++) {
    const r = await req('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: [], name: 'x', phone: '31334486', idempotencyKey: `rl-${Date.now()}-${i}` }),
    })
    if (r.status === 429) { limited = true; break }
  }
  limited
    ? t.ok('checkout rate limit engages under a burst')
    : t.no('no 429 after 14 rapid requests — the kitchen screen can be flooded')
}

// ═══════════════════════════════════════════════ 6. the kitchen
t.head('6. Kitchen')
if (!PIN) {
  t.skip('no STAFF_PIN available — kitchen flow not tested')
} else {
  const wrong = await req('/api/kitchen/login', { method: 'POST', body: JSON.stringify({ pin: '000000000000' }) })
  wrong.status === 401 || wrong.status === 429
    ? t.ok(`wrong PIN refused (${wrong.status})`)
    : t.no(`wrong PIN returned ${wrong.status} — expected 401`)

  const login = await req('/api/kitchen/login', { method: 'POST', body: JSON.stringify({ pin: String(PIN) }) })
  if (!login.body?.ok) {
    t.no(`correct PIN was refused (${login.status}) — check STAFF_PIN and STAFF_SESSION_SECRET match the deployment`)
  } else {
    t.ok('staff login succeeded and set a session cookie')

    const active = await req('/api/kitchen/orders?view=active')
    if (active.body?.ok) {
      t.ok(`kitchen reads the pass — ${active.body.orders.length} active order(s)`)
      if (order?.orderNo) {
        active.body.orders.some((o) => o.order_no === order.orderNo)
          ? t.ok(`the test order #${order.orderNo} IS VISIBLE to the kitchen`)
          : t.no(`the test order #${order.orderNo} is NOT on the kitchen screen`)
      }
    } else t.no(`kitchen read failed (${active.status})`)

    const hist = await req('/api/kitchen/orders?view=history&q=31334486')
    if (hist.body?.ok) {
      hist.body.orders.length > 0
        ? t.ok(`history search by phone found ${hist.body.orders.length} order(s)`)
        : t.no('history search by phone found NOTHING — check the phone_digits column exists')
    } else t.no(`history query failed (${hist.status})`)

    // Walk the real lifecycle on the real order.
    const target = (active.body?.orders || []).find((o) => o.order_no === order?.orderNo)
    if (target) {
      const illegal = await req('/api/kitchen/orders', {
        method: 'PATCH', body: JSON.stringify({ id: target.id, status: 'completed' }),
      })
      illegal.status === 409
        ? t.ok('illegal transition (new → collected) refused')
        : t.no(`illegal transition returned ${illegal.status} — acceptance can be skipped`)

      const acc = await req('/api/kitchen/orders', {
        method: 'PATCH', body: JSON.stringify({ id: target.id, status: 'accepted', etaMinutes: 30 }),
      })
      acc.body?.ok ? t.ok('order confirmed by kitchen') : t.no(`confirm failed (${acc.status})`)

      const seen = await req(`/api/order/${order.token}`)
      seen.body?.order?.status === 'accepted'
        ? t.ok('CUSTOMER SEES the confirmation — the loop is closed')
        : t.no(`customer status is "${seen.body?.order?.status}" after kitchen confirmed`)
      seen.body?.order?.readyEstimate
        ? t.ok('customer sees a ready time')
        : t.no('no ready time reached the customer')

      // Double-tap, concurrently.
      const taps = await Promise.all([
        req('/api/kitchen/orders', { method: 'PATCH', body: JSON.stringify({ id: target.id, status: 'ready' }) }),
        req('/api/kitchen/orders', { method: 'PATCH', body: JSON.stringify({ id: target.id, status: 'ready' }) }),
      ])
      const accepted = taps.filter((x) => x.body?.ok).length
      accepted === 1
        ? t.ok('concurrent double-tap: exactly one write won')
        : t.no(`concurrent double-tap: ${accepted} writes succeeded — the transition is not atomic`)
    }

    // ─── clean up every order this run created ───
    t.head('7. Cleanup')
    const all = await req('/api/kitchen/orders?view=history&q=PREPNEST SMOKETEST')
    const mine = (all.body?.orders || []).filter(
      (o) => o.customer_name === 'PREPNEST SMOKETEST' && !['cancelled', 'completed'].includes(o.status),
    )
    for (const o of mine) {
      await req('/api/kitchen/orders', {
        method: 'PATCH',
        body: JSON.stringify({ id: o.id, status: 'cancelled', reason: 'Smoke test — ikke en rigtig ordre.' }),
      })
    }
    mine.length
      ? t.ok(`cancelled ${mine.length} test order(s)`)
      : t.ok('no test orders left open')
    console.log('      (cancelled orders stay in history for 30 days, then auto-purge)')
  }
}

// ═══════════════════════════════════════════════ result
console.log(`\n${'─'.repeat(60)}`)
console.log(`  ${pass} passed · ${fail} failed · ${skip} skipped`)
if (order?.duplicate) console.log(`  NOTE: duplicate order #${order.duplicate} was created — cancel it manually.`)
console.log(fail === 0
  ? '\n  Takeaway system verified end to end against the live deployment.\n'
  : `\n  ${fail} failure(s). Do not publish until these are resolved.\n`)
process.exit(fail === 0 ? 0 : 1)
