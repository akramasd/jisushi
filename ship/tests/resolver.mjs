/**
 * Lets `node --test` resolve the same import specifiers Next.js uses:
 * the `@/` alias, and extensionless relative imports.
 *
 * Without this, testing any module that imports a sibling means either
 * rewriting the source to suit the test runner — which is the tail wagging the
 * dog — or installing a whole toolchain to run three assertions.
 */
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')
const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js']

function firstExisting(base) {
  if (existsSync(base) && !base.endsWith('/')) return base
  for (const ext of EXTS) if (existsSync(base + ext)) return base + ext
  return null
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const hit = firstExisting(resolvePath(ROOT, specifier.slice(2)))
    if (hit) return next(pathToFileURL(hit).href, context)
  }
  if (specifier.startsWith('.') && !/\.(ts|tsx|js|mjs|json)$/.test(specifier)) {
    const from = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : ROOT
    const hit = firstExisting(resolvePath(from, specifier))
    if (hit) return next(pathToFileURL(hit).href, context)
  }
  return next(specifier, context)
}
