#!/usr/bin/env node
/**
 * Site Integrity — the errors a type checker cannot see.
 *
 * Written after two bugs shipped that a build would have caught and my checks
 * did not: a symbol used without an import, and variables referenced but never
 * declared. Scope checking is now handled by tsc (see .checks/), so this covers
 * the rest:
 *
 *   · internal links pointing at routes that do not exist
 *   · client-only hooks in files without "use client"
 *   · env vars read in code but missing from .env.example
 *   · assets referenced from /public that are not there
 *   · pages missing from the sitemap
 *
 * Usage: node .claude/scripts/site-check.mjs [projectRoot]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.argv[2] ?? process.cwd()
const SKIP = new Set(['node_modules', '.next', '.git', '.checks'])

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e) || e.startsWith('.')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (['.ts', '.tsx'].includes(extname(p))) out.push(p)
  }
  return out
}

const files = [
  ...walk(join(ROOT, 'app')),
  ...walk(join(ROOT, 'components')).filter((f) => !f.includes('/ui/')),
  ...walk(join(ROOT, 'lib')),
  ...walk(join(ROOT, 'hooks')),
].filter((f) => existsSync(f))

const fails = []
const warns = []
const fail = (f, m) => fails.push(`${relative(ROOT, f)}  ${m}`)
const warn = (f, m) => warns.push(`${relative(ROOT, f)}  ${m}`)

// ─────────────────────────────────────────── routes that exist
const appDir = join(ROOT, 'app')
const routes = new Set(['/'])
function collectRoutes(dir, prefix = '') {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue
    const p = join(dir, e)
    if (!statSync(p).isDirectory()) continue
    if (e === 'api') continue
    // (group) folders do not appear in the URL
    const seg = e.startsWith('(') ? '' : `/${e}`
    const full = prefix + seg
    if (['page.tsx', 'page.ts'].some((f) => existsSync(join(p, f)))) routes.add(full || '/')
    collectRoutes(p, full)
  }
}
collectRoutes(appDir)

// ─────────────────────────────────────────── the checks
const CLIENT_HOOKS = /\b(useState|useEffect|useRef|useCallback|useMemo|useReducer|useRouter|useSearchParams|useLayoutEffect)\s*\(/
const envExample = existsSync(join(ROOT, '.env.example'))
  ? readFileSync(join(ROOT, '.env.example'), 'utf8')
  : ''

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const isComponentOrPage = /\.tsx$/.test(file)

  // 1 ── dead internal links
  for (const m of src.matchAll(/href=(?:"|')(\/[^"'#?]*)(?:"|')/g)) {
    const href = m[1].replace(/\/$/, '') || '/'
    if (href.startsWith('/api/')) continue
    // Dynamic segments: /ordre/[token] matches /ordre/anything
    const matches = [...routes].some((r) => {
      if (r === href) return true
      const pattern = '^' + r.replace(/\[[^\]]+\]/g, '[^/]+') + '$'
      return new RegExp(pattern).test(href)
    })
    if (!matches) {
      fail(file, `link to "${href}" — no page.tsx serves that route`)
    }
  }

  // 2 ── client hooks without the directive
  if (isComponentOrPage && CLIENT_HOOKS.test(src) && !/^["']use client["']/m.test(src)) {
    fail(file, 'uses client-only hooks but has no "use client" — this fails at build')
  }

  // 3 ── env vars not documented
  for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) {
    const key = m[1]
    if (['NODE_ENV', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL'].includes(key)) continue
    if (!envExample.includes(key)) {
      warn(file, `reads ${key} but it is not in .env.example — nobody will know to set it`)
    }
  }

  // 4 ── missing public assets
  for (const m of src.matchAll(/(?:src|href)=(?:"|')(\/[^"'?]+\.(?:png|jpg|jpeg|svg|webp|ico|woff2?))(?:"|')/g)) {
    if (!existsSync(join(ROOT, 'public', m[1]))) {
      fail(file, `references ${m[1]} but public${m[1]} does not exist`)
    }
  }

  // 5 ── a JSX component used but never imported or defined locally
  //     (tsc catches this too, but only when it can resolve modules)
  // Declarations, plus the binding forms a component can arrive through:
  // a renamed destructured prop (`as: Tag = 'div'`) is a local name even
  // though nothing declares it with `const`.
  const localNames = new Set([
    ...[...src.matchAll(/(?:function|const|let|class)\s+([A-Z]\w*)/g)].map((m) => m[1]),
    ...[...src.matchAll(/\w+\s*:\s*([A-Z]\w*)\s*[=,}]/g)].map((m) => m[1]),
    ...[...src.matchAll(/[{,]\s*([A-Z]\w*)\s*[,}=]/g)].map((m) => m[1]),
  ])
  const imported = new Set(
    [...src.matchAll(/import\s+(?:type\s+)?(?:(\w+)|{([^}]+)})\s+from/g)].flatMap((m) =>
      m[1] ? [m[1]] : m[2].split(',').map((x) => x.trim().split(/\s+as\s+/).pop().trim()),
    ),
  )
  //
  //     Two things stop this from matching TypeScript generics, which is what
  //     it did on the first attempt — reporting `useState<Cart>` and
  //     `postJson<T>` as missing components, twenty false positives in a row.
  //     Generics have a word character immediately before the `<`; JSX does
  //     not. And a .ts file cannot contain JSX at all.
  if (isComponentOrPage) {
    for (const m of src.matchAll(/(^|[\s(){}>=,;:?&|[])<([A-Z]\w*)[\s/>]/gm)) {
      const name = m[2]
      if (localNames.has(name) || imported.has(name)) continue
      if (['Fragment', 'Suspense'].includes(name)) continue
      fail(file, `<${name}> is used but neither imported nor defined in this file`)
    }
  }
}

// 6 ── public pages absent from the sitemap
const sitemapPath = join(ROOT, 'app', 'sitemap.ts')
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf8')
  for (const r of routes) {
    if (r === '/') continue
    if (/\[/.test(r)) continue                       // dynamic
    if (/kitchen|admin|ordre/.test(r)) continue      // deliberately excluded
    if (!sitemap.includes(`'${r}'`) && !sitemap.includes(`"${r}"`)) {
      warn(sitemapPath, `${r} has a page but is not in the sitemap`)
    }
  }
}

// ─────────────────────────────────────────── report
console.log('SITE INTEGRITY\n')
console.log(`  ${files.length} files · ${routes.size} routes\n`)
for (const w of warns) console.log(`  WARN  ${w}`)
if (warns.length) console.log('')
for (const f of fails) console.log(`  FAIL  ${f}`)

if (fails.length === 0) {
  console.log('  PASS  no dead links, missing directives, or unresolved components.')
  process.exit(0)
}
console.log(`\n  ${fails.length} problem(s) that would break at build or in the browser.`)
process.exit(1)
