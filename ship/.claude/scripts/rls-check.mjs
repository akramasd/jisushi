#!/usr/bin/env node
/**
 * Security Auditor — two checks that share one root cause.
 *
 * 1. RLS policies. The anon key ships to the browser; it is public by
 *    construction. So `CREATE POLICY ... FOR ALL USING (true)` is not a
 *    permission model, it is an open database. Any table holding customer PII
 *    (names, phones, order history) or prices must not be world-writable.
 *
 * 2. Staff-only routes. A page that reads every pending order needs a gate in
 *    front of it. "Nobody knows the URL" is not a gate, and `robots: noindex`
 *    is a request to crawlers, not an access control.
 *
 * Restaurant-agnostic: table sensitivity is matched on name patterns, so a new
 * PREPNEST deployment inherits the same rules without configuration.
 *
 * Usage: node .claude/scripts/rls-check.mjs [projectRoot] [schemaPath]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.argv[2] ?? process.cwd()
const SCHEMA = process.argv[3] ?? join(ROOT, 'schema.sql')

/** Tables whose contents are either personal data or money. */
const SENSITIVE = [
  { re: /order/i, why: 'customer names, phone numbers and order history', publicRead: false },
  { re: /customer|loyalty|guest/i, why: 'personal data', publicRead: false },
  // A menu is on the wall outside — public READ is the point. Public WRITE is a
  // 1 kr sushi box. Flagging the read here would train people to ignore output.
  { re: /menu|item|product/i, why: 'prices', publicRead: true },
  { re: /setting|config|theme|webhook/i, why: 'site config and webhook secrets', publicRead: false },
  { re: /subscription|push|token|session/i, why: 'delivery tokens', publicRead: false },
  // Error text can carry request fragments; queued messages carry phone numbers.
  { re: /event|log|audit/i, why: 'error detail that may quote a request', publicRead: false },
  { re: /message|outbound|queue|notification/i, why: 'customer phone numbers', publicRead: false },
]

/** Routes that must never be reachable by a member of the public. */
const STAFF_ROUTES = [/kitchen/i, /kds/i, /admin/i, /owner/i, /staff/i, /dashboard/i]

const findings = []
const pass = []

// ------------------------------------------------------------------ RLS

if (!existsSync(SCHEMA)) {
  findings.push({ sev: 'FAIL', where: 'schema.sql', msg: 'no schema file found to audit' })
} else {
  const sql = readFileSync(SCHEMA, 'utf8')

  const rlsEnabled = new Set(
    [...sql.matchAll(/ALTER\s+TABLE\s+["`]?(\w+)["`]?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)].map(
      (m) => m[1],
    ),
  )
  const allTables = new Set(
    [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?/gi)].map((m) => m[1]),
  )

  // CREATE POLICY name ON table FOR cmd USING (expr) [WITH CHECK (expr)]
  const policies = [
    ...sql.matchAll(
      /CREATE\s+POLICY\s+["`]?(\w+)["`]?\s+ON\s+["`]?(\w+)["`]?\s+FOR\s+(\w+)([\s\S]*?);/gi,
    ),
  ].map((m) => ({ name: m[1], table: m[2], cmd: m[3].toUpperCase(), body: m[4] }))

  for (const t of allTables) {
    const sens = SENSITIVE.find((s) => s.re.test(t))
    if (!rlsEnabled.has(t)) {
      findings.push({
        sev: sens ? 'FAIL' : 'WARN',
        where: `${relative(ROOT, SCHEMA)} · ${t}`,
        msg: `RLS is never enabled on "${t}"${sens ? ` — it holds ${sens.why}` : ''}`,
      })
      continue
    }
    const mine = policies.filter((p) => p.table === t)
    if (mine.length === 0) {
      // RLS on with no policy = deny all. For a table that should only ever be
      // touched by the service role, that is the correct end state, not a bug.
      if (sens && !sens.publicRead) {
        pass.push(`${t}: RLS on, no anon policy — server-side access only`)
      } else {
        findings.push({
          sev: 'WARN',
          where: `${relative(ROOT, SCHEMA)} · ${t}`,
          msg: `RLS enabled on "${t}" with no policy — every anon query is denied. Intended?`,
        })
      }
      continue
    }
    for (const p of mine) {
      const open = /USING\s*\(\s*true\s*\)/i.test(p.body)
      const openWrite = /WITH\s+CHECK\s*\(\s*true\s*\)/i.test(p.body)
      const writeCmd = p.cmd === 'ALL' || ['INSERT', 'UPDATE', 'DELETE'].includes(p.cmd)
      if (p.cmd === 'SELECT' && sens?.publicRead) {
        pass.push(`${t}: public SELECT only — no write path from the browser`)
      }

      if (open && sens && !sens.publicRead && !(sens.publicRead && p.cmd === 'SELECT')) {
        findings.push({
          sev: 'FAIL',
          where: `${relative(ROOT, SCHEMA)} · ${t}`,
          msg:
            `policy "${p.name}" is FOR ${p.cmd} USING (true) — anyone with the public anon key ` +
            `can read ${sens.why}`,
        })
      }
      if (openWrite && writeCmd && sens) {
        findings.push({
          sev: 'FAIL',
          where: `${relative(ROOT, SCHEMA)} · ${t}`,
          msg: `policy "${p.name}" allows unrestricted writes/deletes to "${t}" from the browser`,
        })
      }
      if (!open && !openWrite) pass.push(`${t}: policy "${p.name}" is scoped`)
    }
  }
}

// --------------------------------------------------------- staff routes

const appDir = ['app', 'src/app', 'pages', 'src/pages'].map((d) => join(ROOT, d)).find(existsSync)

function routeDirs(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    if (e.startsWith('.') || e === 'node_modules') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      acc.push(p)
      routeDirs(p, acc)
    }
  }
  return acc
}

/** Signals that some gate exists. Presence is checked, not correctness. */
const AUTH_HINTS =
  /getUser\(|getSession\(|verifySession\(|auth\.|requireAuth|redirect\(|unauthorized|signIn|NEXTAUTH|cookies\(\)|process\.env\.[A-Z_]*(PASSWORD|PIN|SECRET|TOKEN)/

if (appDir) {
  const mwPath = ['middleware.ts', 'middleware.js', 'src/middleware.ts']
    .map((f) => join(ROOT, f))
    .find(existsSync)

  /** Matcher patterns the middleware actually guards, e.g. '/kitchen/:path*'. */
  const guarded = []
  if (mwPath) {
    const mw = readFileSync(mwPath, 'utf8')
    const m = mw.match(/matcher\s*:\s*\[([\s\S]*?)\]/)
    if (m) for (const q of m[1].matchAll(/['"`]([^'"`]+)['"`]/g)) guarded.push(q[1])
  }
  const isGuarded = (routePath) =>
    guarded.some((g) => routePath.startsWith('/' + g.replace(/^\//, '').split('/:')[0]))

  /** Read every file under a route, not just its top level — auth often lives
   *  in a nested route handler rather than the folder you first look in. */
  const readTree = (dir) => {
    let out = ''
    for (const e of readdirSync(dir)) {
      if (e.startsWith('.') || e === 'node_modules') continue
      const p = join(dir, e)
      if (statSync(p).isDirectory()) out += readTree(p)
      else if (/\.(tsx?|jsx?)$/.test(e)) out += readFileSync(p, 'utf8') + '\n'
    }
    return out
  }

  for (const dir of routeDirs(appDir)) {
    const name = relative(ROOT, dir)
    if (!STAFF_ROUTES.some((r) => r.test(dir.split('/').pop()))) continue

    // '/kitchen' from 'app/kitchen', '/api/kitchen' from 'app/api/kitchen'
    const routePath = '/' + name.replace(/^(src\/)?(app|pages)\//, '')
    const src = readTree(dir)
    const hasMiddleware = isGuarded(routePath)

    if (AUTH_HINTS.test(src)) {
      pass.push(
        `${name}: verifies auth in-route${hasMiddleware ? ' (and middleware guards it)' : ''}`,
      )
    } else if (hasMiddleware) {
      pass.push(`${name}: guarded by middleware matcher`)
    } else {
      findings.push({
        sev: 'FAIL',
        where: name,
        msg:
          'staff-only route is publicly reachable — no auth check and no middleware. ' +
          (/robots|noindex/i.test(src)
            ? 'noindex only asks crawlers to look away; it does not stop anyone.'
            : ''),
      })
    }
  }
}

// ------------------------------------------------------------------ out

console.log('SECURITY AUDITOR\n')
for (const p of pass) console.log(`  PASS  ${p}`)
if (pass.length) console.log('')
for (const f of findings.filter((f) => f.sev === 'WARN')) console.log(`  WARN  ${f.where}  ${f.msg}`)
for (const f of findings.filter((f) => f.sev === 'FAIL')) console.log(`  FAIL  ${f.where}  ${f.msg}`)

const fails = findings.filter((f) => f.sev === 'FAIL').length
if (fails === 0) {
  console.log('\n  No open-door findings.')
  process.exit(0)
}
console.log(`\n  ${fails} finding(s) that expose data or staff surfaces to the public.`)
process.exit(1)
