import { pathToFileURL, fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { dirname, resolve as r } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = r(HERE, '../..')
const STUBS = {
  'next/server': r(HERE, 'next-server.ts'),
  'next/headers': r(HERE, 'next-headers.ts'),
  '@supabase/supabase-js': r(HERE, 'supabase-js.ts'),
}
const EXTS = ['.ts', '.tsx', '/index.ts']
const hit = (b) => (existsSync(b) && /\.(ts|tsx)$/.test(b) ? b : EXTS.map((e) => b + e).find(existsSync))

export async function resolve(spec, ctx, next) {
  if (STUBS[spec]) return next(pathToFileURL(STUBS[spec]).href, ctx)
  if (spec.startsWith('@/')) {
    const f = hit(r(ROOT, spec.slice(2)))
    if (f) return next(pathToFileURL(f).href, ctx)
  }
  if (spec.startsWith('.') && !/\.(ts|tsx|js|mjs|json)$/.test(spec)) {
    const from = ctx.parentURL ? dirname(fileURLToPath(ctx.parentURL)) : ROOT
    const f = hit(r(from, spec))
    if (f) return next(pathToFileURL(f).href, ctx)
  }
  return next(spec, ctx)
}
