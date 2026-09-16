#!/usr/bin/env node
/**
 * Order-Flow Integrity — guards the money path.
 *
 * Ji Sushi's checkout already gets most of this right. The point of the check
 * is the *next* deployment: when a restaurant forks the template and someone
 * "simplifies" the checkout route, these invariants are the ones that quietly
 * disappear and are only noticed when the till doesn't match the orders.
 *
 * Invariants, in the order they matter:
 *   1. The server re-prices every line from the database.
 *   2. The client's submitted price is never persisted.
 *   3. Sold-out items are rejected server-side.
 *   4. Opening hours are enforced server-side, in the restaurant's timezone.
 *   5. Quantities are clamped (no negative qty to make a total go down).
 *   6. The route is rate-limited.
 *
 * Usage: node .claude/scripts/order-flow-check.mjs [projectRoot]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

const ROOT = process.argv[2] ?? process.cwd()

/**
 * Finds routes that CREATE an order — not every route with "order" in its path.
 *
 * A kitchen route that flips a status to "completed" has no money path to
 * guard, and auditing it produces four confident failures about invariants it
 * was never meant to hold. False alarms are how a check earns its way into
 * being ignored, so the signal here is an actual insert, not a filename.
 */
function findCheckoutRoutes(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const e of readdirSync(dir)) {
    if (e.startsWith('.') || e === 'node_modules') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      findCheckoutRoutes(p, acc)
      continue
    }
    if (!/route\.(ts|js)$/.test(e)) continue

    const src = readFileSync(p, 'utf8')
    // Staff and system routes write order rows too — a diagnostics route, a
    // migration, an import. They are not the customer money path, and auditing
    // them for opening-hours guards produces confident nonsense.
    if (/(kitchen|admin|staff|selftest|cron|debug)/i.test(p)) continue

    const insertsAnOrder =
      /\.from\(\s*['"`]\w*order\w*['"`]\s*\)[\s\S]{0,300}?\.insert\(/i.test(src) ||
      /\.insert\([\s\S]{0,300}?\.from\(\s*['"`]\w*order\w*['"`]/i.test(src)
    const looksLikeCheckout = /checkout|cart|\bpay\b/i.test(p)

    if (insertsAnOrder || looksLikeCheckout) acc.push(p)
  }
  return acc
}

const routes = [
  ...findCheckoutRoutes(join(ROOT, 'app')),
  ...findCheckoutRoutes(join(ROOT, 'src/app')),
]

const CHECKS = [
  {
    id: 'server-reprice',
    label: 'server re-prices from the database',
    ok: (s) => /\.from\(\s*['"`]\w*(menu|item|product)\w*['"`]\s*\)[\s\S]{0,400}?select/i.test(s),
    fail: 'no menu lookup found — the route may be trusting client prices',
  },
  {
    id: 'no-client-price',
    label: 'client price is not persisted',
    // A red flag: reading `price` off the request body and writing it through.
    ok: (s) => !/body[\s\S]{0,200}?\.price\b/i.test(s),
    fail: 'the request body\'s price is read — anyone can post a 1 kr order',
  },
  {
    id: 'sold-out',
    label: 'sold-out items rejected server-side',
    ok: (s) => /(is_)?available|sold_?out|in_?stock|udsolgt/i.test(s),
    fail: 'no availability check — 86\'d items can still be ordered',
  },
  {
    id: 'hours',
    label: 'opening hours enforced server-side',
    ok: (s) => /openingHours|canAccept|isOpen|getOpenState|opening-hours/i.test(s),
    fail: 'no opening-hours guard — orders can land at 03:00 with nobody in the kitchen',
  },
  {
    id: 'qty-clamp',
    label: 'quantities clamped',
    ok: (s) => /Math\.(max|min)\([\s\S]{0,80}?(qty|quantity|antal)/i.test(s) ||
               /(qty|quantity|antal)[\s\S]{0,80}?Math\.(max|min)\(/i.test(s),
    fail: 'quantity is not clamped — a negative or absurd qty reaches the total',
  },
  {
    id: 'rate-limit',
    label: 'rate limited',
    ok: (s) => /rateLimit|ratelimit|throttle|Upstash|limiter/i.test(s),
    fail: 'no rate limiting — the kitchen screen can be flooded with fake orders',
    sev: 'WARN',
  },
]

/**
 * Follows the route's own imports one level deep.
 *
 * Extracting the pricing logic into a pure, tested module is an IMPROVEMENT —
 * but a checker that only reads the route file sees the guard disappear and
 * reports a regression. Rewarding the wrong thing is how a check ends up
 * arguing against good structure.
 */
function withImports(routeFile) {
  const src = readFileSync(routeFile, 'utf8')
  let combined = src
  const root = ROOT

  for (const m of src.matchAll(/from\s+['"`](@\/[^'"`]+|\.[^'"`]+)['"`]/g)) {
    const spec = m[1]
    const base = spec.startsWith('@/')
      ? join(root, spec.slice(2))
      : join(dirname(routeFile), spec)
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      if (existsSync(base + ext)) {
        combined += '\n' + readFileSync(base + ext, 'utf8')
        break
      }
    }
  }
  return combined
}

console.log('ORDER-FLOW INTEGRITY\n')

if (routes.length === 0) {
  console.log('  WARN  no checkout/order route found to audit.')
  process.exit(0)
}

let fails = 0
for (const r of routes) {
  const src = withImports(r)
  console.log(`  ${relative(ROOT, r)}`)
  for (const c of CHECKS) {
    if (c.ok(src)) {
      console.log(`    PASS  ${c.label}`)
    } else if (c.sev === 'WARN') {
      console.log(`    WARN  ${c.label} — ${c.fail}`)
    } else {
      console.log(`    FAIL  ${c.label} — ${c.fail}`)
      fails++
    }
  }
  console.log('')
}

if (fails === 0) {
  console.log('  Money path intact.')
  process.exit(0)
}
console.log(`  ${fails} broken invariant(s) on the money path.`)
process.exit(1)
