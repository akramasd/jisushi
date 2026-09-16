#!/usr/bin/env node
/**
 * Schema Guardian — cross-references every Supabase query in the codebase
 * against the columns actually defined in schema.sql.
 *
 * Catches the class of bug where the SQL says `is_available` and the TypeScript
 * says `available`: no type error, no lint error, just a 400 from PostgREST at
 * runtime in the middle of a customer's order.
 *
 * Restaurant-agnostic: it reads whatever schema.sql it is pointed at, so the
 * same check runs unchanged against every PREPNEST deployment.
 *
 * Usage: node .claude/scripts/schema-check.mjs [projectRoot] [schemaPath]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const ROOT = process.argv[2] ?? process.cwd()
const SCHEMA = process.argv[3] ?? join(ROOT, 'schema.sql')
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out'])
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

// ---------------------------------------------------------------- schema

/** table -> Set(columns), from CREATE TABLE and ALTER TABLE ... ADD COLUMN. */
const types = new Map() // 'table.column' -> SQL type

/** Maps a SQL type to the JS/TS type a value of it actually arrives as. */
function jsTypeOf(sqlType) {
  if (/^(UUID|TEXT|VARCHAR|CHAR|DATE|TIMESTAMP)/.test(sqlType)) return 'string'
  if (/^(INT|BIGINT|SMALLINT|SERIAL|NUMERIC|DECIMAL|REAL|DOUBLE)/.test(sqlType)) return 'number'
  if (/^BOOL/.test(sqlType)) return 'boolean'
  return null
}

function parseSchema(sql) {
  const tables = new Map()

  // CREATE TABLE [IF NOT EXISTS] name ( ...body... );
  const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\n\s*\)\s*;/gi
  for (const m of sql.matchAll(createRe)) {
    const [, table, body] = m
    const cols = new Set()
    // Split top-level commas only (types like NUMERIC(10,2) contain commas).
    let depth = 0
    let buf = ''
    const lines = []
    for (const ch of body) {
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (ch === ',' && depth === 0) { lines.push(buf); buf = ''; continue }
      buf += ch
    }
    lines.push(buf)

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      // Skip table-level constraints, not column definitions.
      if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|EXCLUDE)\b/i.test(line)) continue
      const col = line.match(/^["`]?(\w+)["`]?\s+([A-Za-z ]+(?:\([\d, ]+\))?)/)
      if (col) {
        cols.add(col[1])
        types.set(`${table}.${col[1]}`, col[2].trim().toUpperCase())
      }
    }
    tables.set(table, cols)
  }

  // ALTER TABLE name ADD COLUMN [IF NOT EXISTS] col
  const alterRe = /ALTER\s+TABLE\s+["`]?(\w+)["`]?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*([A-Za-z ]+(?:\([\d, ]+\))?)?/gi
  for (const m of sql.matchAll(alterRe)) {
    const [, table, col, ty] = m
    if (ty) types.set(`${table}.${col}`, ty.trim().toUpperCase())
    if (!tables.has(table)) tables.set(table, new Set())
    tables.get(table).add(col)
  }

  return tables
}

// ---------------------------------------------------------------- queries

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (CODE_EXT.has(extname(p))) out.push(p)
  }
  return out
}

/**
 * Finds `.from("table")` and the columns referenced in the chained calls that
 * follow it: .select(), .eq(), .order(), .insert({...}), .update({...}).
 *
 * Deliberately conservative — it only looks at string/object literals it can
 * read with certainty. A dynamically built column name is reported as
 * "unverifiable" rather than guessed at, because a false alarm every commit
 * is how a check gets switched off.
 */
function extractQueries(src, file) {
  const found = []
  const fromRe = /\.from\(\s*['"`](\w+)['"`]\s*\)/g

  for (const m of src.matchAll(fromRe)) {
    const table = m[1]
    const start = m.index + m[0].length
    // Look ahead through the chained call, stopping at a statement boundary.
    // Stop at the NEXT .from(): otherwise a second query within 800 characters
    // has its columns attributed to the first table, which reports real columns
    // of table B as missing from table A.
    let chunk = src.slice(start, start + 800)
    const nextFrom = chunk.search(/\.from\(\s*['"`]/)
    if (nextFrom !== -1) chunk = chunk.slice(0, nextFrom)
    const line = src.slice(0, m.index).split('\n').length
    const cols = new Set()
    let unverifiable = false

    // .select('a,b,c') / .select("a, b")
    for (const s of chunk.matchAll(/\.select\(\s*['"`]([^'"`]*)['"`]/g)) {
      for (const raw of s[1].split(',')) {
        const c = raw.trim().split(/[\s:(]/)[0]
        if (!c || c === '*') continue
        cols.add(c)
      }
    }
    if (/\.select\(\s*[^'"`)]/.test(chunk)) unverifiable = true

    // .eq('col', x) / .neq / .gt / .lt / .gte / .lte / .like / .ilike / .in / .order('col')
    for (const s of chunk.matchAll(
      /\.(eq|neq|gt|gte|lt|lte|like|ilike|in|is|order|contains)\(\s*['"`](\w+)['"`]/g,
    )) {
      cols.add(s[2])
    }

    // .insert({ col: ..., col2: ... }) / .update({ ... }) / .upsert({ ... })
    for (const s of chunk.matchAll(/\.(insert|update|upsert)\(\s*\{([\s\S]{0,600}?)\}\s*\)/g)) {
      // Anchor to `{` or `,` so a ternary's `cond ? x : 0` isn't read as a key.
      for (const k of s[2].matchAll(/(?:^|[,{])\s*["'`]?(\w+)["'`]?\s*:/g)) cols.add(k[1])
      if (/\.\.\./.test(s[2])) unverifiable = true
    }

    found.push({ table, cols: [...cols], file, line, unverifiable })
  }
  return found
}

// ---------------------------------------------------------------- run

/**
 * Strips SQL comments before parsing.
 *
 * Without this, a comma inside a `--` comment is read as a column separator:
 * "Ties a message to what caused it, so one status change..." split the column
 * list mid-sentence, hid the column that followed, and registered a phantom
 * column called "so". Both a false negative and a false positive from one bug.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block comments
    .replace(/--[^\n]*/g, '')             // line comments
}

let sql
try {
  sql = stripComments(readFileSync(SCHEMA, 'utf8'))
} catch {
  console.error(`SCHEMA GUARDIAN: cannot read schema at ${SCHEMA}`)
  process.exit(2)
}

const tables = parseSchema(sql)
const queries = walk(ROOT).flatMap((f) => extractQueries(readFileSync(f, 'utf8'), f))

const errors = []
const warnings = []

for (const q of queries) {
  if (!tables.has(q.table)) {
    errors.push({
      file: relative(ROOT, q.file),
      line: q.line,
      msg: `table "${q.table}" is queried but never created in ${relative(ROOT, SCHEMA)}`,
    })
    continue
  }
  const defined = tables.get(q.table)
  for (const c of q.cols) {
    if (defined.has(c)) continue
    // Suggest the closest defined column — the usual cause is a rename or a
    // prefix drift like is_available -> available.
    const near = [...defined].find(
      (d) => d.includes(c) || c.includes(d) || d.replace(/^is_/, '') === c,
    )
    errors.push({
      file: relative(ROOT, q.file),
      line: q.line,
      msg:
        `${q.table}.${c} does not exist in the schema` +
        (near ? ` — did you mean "${near}"?` : ''),
    })
  }
  if (q.unverifiable) {
    warnings.push({
      file: relative(ROOT, q.file),
      line: q.line,
      msg: `query on "${q.table}" builds columns dynamically — not verifiable statically`,
    })
  }
}

// ---------------------------------------------------- declared TS types
//
// The column-name check alone missed a worse bug than the one it caught: a
// UUID primary key typed as `number` in TypeScript. Nothing errored — but
// `Number(uuid)` is NaN, so every cart lookup silently failed and no order
// could be placed. Names matching is not the same as types matching.

const TYPE_DECL = /(\w+)\s*:\s*(string|number|boolean)\b/g

for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  // Find `export type X = { ... }` blocks and read their field types.
  for (const block of src.matchAll(/export\s+type\s+(\w+)\s*=\s*\{([\s\S]*?)\n\}/g)) {
    const [, typeName, body] = block
    // Match the TS type name to a table: MenuItem -> menu_items, Order -> orders.
    const snake = typeName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
    const table = [...tables.keys()].find(
      (t) => t === snake || t === `${snake}s` || t.replace(/s$/, '') === snake,
    )
    if (!table) continue

    for (const f of body.matchAll(TYPE_DECL)) {
      const [, col, tsType] = f
      const sqlType = types.get(`${table}.${col}`)
      if (!sqlType) continue
      const expected = jsTypeOf(sqlType)
      if (!expected || expected === tsType) continue
      errors.push({
        file: relative(ROOT, file),
        line: src.slice(0, block.index).split('\n').length,
        msg:
          `${typeName}.${col} is declared \`${tsType}\`, but ${table}.${col} is ` +
          `${sqlType} — values arrive as \`${expected}\`` +
          (expected === 'string' && tsType === 'number'
            ? '. Number(uuid) is NaN, so comparisons silently fail rather than error.'
            : ''),
      })
    }
  }
}

console.log(`SCHEMA GUARDIAN`)
console.log(`  schema:  ${relative(ROOT, SCHEMA)} (${tables.size} tables)`)
console.log(`  queries: ${queries.length} call sites\n`)

for (const w of warnings) console.log(`  WARN  ${w.file}:${w.line}  ${w.msg}`)
for (const e of errors) console.log(`  FAIL  ${e.file}:${e.line}  ${e.msg}`)

if (errors.length === 0) {
  console.log('  PASS  every queried column exists in the schema.')
  process.exit(0)
}
console.log(`\n  ${errors.length} schema mismatch(es). These fail at runtime, not at build time.`)
process.exit(1)
