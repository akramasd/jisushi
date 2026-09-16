#!/usr/bin/env node
/**
 * Pre-flight — verifies your REAL Supabase project before you publish.
 *
 * This talks to your actual database using your actual keys. It does not
 * simulate anything. Run it after applying schema.sql and before going live.
 *
 *   node scripts/preflight.mjs
 *
 * Reads .env.local (or .env) from the project root.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

// ---------------------------------------------------------------- env
function loadEnv() {
  const env = { ...process.env }
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!env[m[1]]) env[m[1]] = v
    }
  }
  return env
}

const env = loadEnv()
const results = []
const ok = (m) => results.push({ s: 'PASS', m })
const warn = (m) => results.push({ s: 'WARN', m })
const bad = (m) => results.push({ s: 'FAIL', m })

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = env.SUPABASE_SERVICE_ROLE_KEY

// ---------------------------------------------------------------- 1. env vars
console.log('\nPRE-FLIGHT — checking your real Supabase project\n')

for (const [k, v] of [
  ['NEXT_PUBLIC_SUPABASE_URL', URL_],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON],
  ['SUPABASE_SERVICE_ROLE_KEY', SVC],
]) {
  v ? ok(`${k} is set`) : bad(`${k} is MISSING — nothing will work without it`)
}

if (env.STAFF_PIN && String(env.STAFF_PIN).length >= 4) ok('STAFF_PIN is set')
else bad('STAFF_PIN missing or under 4 digits — /kitchen will be locked shut')

if (env.STAFF_SESSION_SECRET && env.STAFF_SESSION_SECRET.length >= 32) ok('STAFF_SESSION_SECRET is set')
else bad('STAFF_SESSION_SECRET missing or under 32 chars — /kitchen will be locked shut')

env.CRON_SECRET ? ok('CRON_SECRET is set') : warn('CRON_SECRET not set — 30-day auto-purge will not run')

if (ANON && SVC && ANON === SVC) bad('anon key and service-role key are IDENTICAL — that exposes your whole database')

if (!URL_ || !ANON || !SVC) {
  report()
  process.exit(1)
}

async function rest(path, key, init = {}) {
  try {
    return await fetch(`${URL_}/rest/v1/${path}`, {
      ...init,
      signal: AbortSignal.timeout(20_000),
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })
  } catch (e) {
    // A network failure must read as a message, not a stack trace.
    return { ok: false, status: 0, _netErr: e.cause?.code ?? e.message,
             json: async () => [], text: async () => String(e.message) }
  }
}

// ---------------------------------------------------------------- 2. reachable
try {
  const r = await rest('menu_items?select=id&limit=1', SVC)
  if (r.ok) ok('Supabase reachable with the service-role key')
  else bad(`Supabase rejected the service-role key (HTTP ${r.status}) — wrong key or wrong project`)
} catch (e) {
  bad(`Cannot reach ${URL_} — ${e.message}`)
  report()
  process.exit(1)
}

// ---------------------------------------------------------------- 3. migrated
const REQUIRED = {
  menu_items: ['id', 'name', 'price', 'category', 'is_available', 'sort_order'],
  orders: [
    'id', 'order_no', 'customer_name', 'customer_phone', 'items', 'total_price',
    'status', 'pickup_minutes', 'idempotency_key', 'public_token', 'phone_digits',
    'accepted_at', 'ready_at', 'completed_at', 'cancelled_at', 'ready_estimate',
  ],
  settings: ['id'],
}

for (const [table, cols] of Object.entries(REQUIRED)) {
  const r = await rest(`${table}?select=${cols.join(',')}&limit=1`, SVC)
  if (r.ok) {
    ok(`${table}: all ${cols.length} required columns present`)
  } else {
    const body = await r.text()
    const missing = body.match(/column "?(\w+)"? does not exist/)?.[1]
    bad(
      missing
        ? `${table}.${missing} is MISSING — schema.sql has not been re-run`
        : `${table} query failed (HTTP ${r.status}) — ${body.slice(0, 120)}`,
    )
  }
}

// ---------------------------------------------------------------- 4. menu seeded + ordered
{
  const r = await rest('menu_items?select=name,sort_order,is_available&order=sort_order.asc', SVC)
  if (r.ok) {
    const rows = await r.json()
    if (rows.length === 0) bad('menu_items is EMPTY — customers will see no menu')
    else {
      ok(`menu_items: ${rows.length} items seeded`)
      const unordered = rows.filter((x) => x.sort_order == null || x.sort_order >= 9000).length
      if (unordered === 0) ok('every menu item has a sort position')
      else warn(`${unordered} item(s) have no sort position — they will list last`)
      const off = rows.filter((x) => x.is_available === false)
      if (off.length) warn(`${off.length} item(s) marked sold out: ${off.slice(0, 5).map((x) => x.name).join(', ')}`)
    }
  }
}

// ---------------------------------------------------------------- 5. RLS, for real
//
// The important one. The anon key is public — it ships in your JavaScript. This
// checks what an attacker with that key can actually do, by trying it.
{
  const svcOrders = await rest('orders?select=id&limit=1', SVC)
  const hasOrders = svcOrders.ok && (await svcOrders.json()).length > 0

  const anonOrders = await rest('orders?select=id,customer_name,customer_phone&limit=5', ANON)
  if (!anonOrders.ok) {
    ok(`orders: anon read refused (HTTP ${anonOrders.status})`)
  } else {
    const rows = await anonOrders.json()
    if (rows.length > 0) {
      bad(`orders: ANON KEY CAN READ ${rows.length} CUSTOMER RECORD(S) — names and phone numbers are public. Re-run schema.sql.`)
    } else if (hasOrders) {
      ok('orders: rows exist but anon reads nothing — RLS is doing its job')
    } else {
      warn('orders: anon reads nothing, but the table is empty — place a test order and re-run to confirm')
    }
  }

  // Writes are the other half.
  const anonWrite = await rest('orders', ANON, {
    method: 'POST',
    body: JSON.stringify({ customer_name: 'PREFLIGHT', customer_phone: '00000000', items: [], total_price: 0 }),
  })
  if (anonWrite.ok) bad('orders: ANON KEY CAN INSERT — anyone can create fake orders. Re-run schema.sql.')
  else ok(`orders: anon write refused (HTTP ${anonWrite.status})`)

  const anonMenuWrite = await rest('menu_items', ANON, {
    method: 'POST',
    body: JSON.stringify({ name: `PREFLIGHT ${Date.now()}`, price: 1, category: 'x' }),
  })
  if (anonMenuWrite.ok) bad('menu_items: ANON KEY CAN INSERT — prices are editable from any browser. Re-run schema.sql.')
  else ok(`menu_items: anon write refused (HTTP ${anonMenuWrite.status})`)

  const anonMenuRead = await rest('menu_items?select=id&limit=1', ANON)
  if (anonMenuRead.ok) ok('menu_items: anon read allowed — correct, the menu is public')
  else bad(`menu_items: anon read REFUSED (HTTP ${anonMenuRead.status}) — the public menu will be empty`)

  const anonSettings = await rest('settings?select=webhook_secret&limit=1', ANON)
  if (anonSettings.ok && (await anonSettings.json()).length > 0) {
    bad('settings: ANON KEY CAN READ your webhook secret. Re-run schema.sql.')
  } else ok('settings: anon read refused or empty')
}

// ---------------------------------------------------------------- 6. constraints
{
  const key = `preflight-${Date.now()}`
  const row = {
    customer_name: 'PREFLIGHT TEST', customer_phone: '00000000',
    items: [], total_price: 0, status: 'pending', idempotency_key: key,
  }
  const a = await rest('orders', SVC, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })
  if (!a.ok) {
    warn(`could not create a test row to check the idempotency constraint (HTTP ${a.status})`)
  } else {
    const [created] = await a.json()
    const b = await rest('orders', SVC, { method: 'POST', body: JSON.stringify(row) })
    if (b.status === 409) ok('idempotency_key is UNIQUE — a retry cannot create a second order')
    else bad('idempotency_key is NOT unique — a dropped connection WILL create duplicate orders. Re-run schema.sql.')

    if (created?.phone_digits === '00000000') ok('phone_digits generates correctly — history search by phone will work')
    else bad(`phone_digits did not generate (got ${JSON.stringify(created?.phone_digits)}) — phone search will find nothing`)

    await rest(`orders?id=eq.${created.id}`, SVC, { method: 'DELETE' })
    ok('test row cleaned up')
  }
}

// ---------------------------------------------------------------- 7. alerts
{
  const r = await rest('settings?select=webhook_url&id=eq.main', SVC)
  if (r.ok) {
    const [s] = await r.json()
    if (s?.webhook_url) ok('kitchen webhook configured — orders reach a phone even if the KDS tab is closed')
    else warn('no webhook_url in settings — if the kitchen tab is closed, nobody is alerted')
  }
}

report()

function report() {
  console.log('')
  for (const r of results.filter((x) => x.s === 'PASS')) console.log(`  PASS  ${r.m}`)
  console.log('')
  for (const r of results.filter((x) => x.s === 'WARN')) console.log(`  WARN  ${r.m}`)
  for (const r of results.filter((x) => x.s === 'FAIL')) console.log(`  FAIL  ${r.m}`)

  const fails = results.filter((x) => x.s === 'FAIL').length
  console.log('')
  console.log(fails === 0
    ? '  Database is ready. Next: node scripts/smoke.mjs <your-url>'
    : `  ${fails} blocking problem(s). Do not publish until these are clear.`)
  console.log('')
  process.exitCode = fails === 0 ? 0 : 1
}
