/**
 * In-memory stand-in for the PostgREST client, enforcing the constraints the
 * route logic actually depends on:
 *
 *   - the UNIQUE index on idempotency_key, raising code 23505 like Postgres
 *   - conditional UPDATE ... WHERE status = $from returning zero rows on a race
 *   - NUMERIC coming back as a string, which is how PostgREST really behaves
 *
 * The point is not to emulate Postgres. It is to let the REAL handler code run,
 * so a bug in the handler shows up as a failing test rather than as a surprise
 * on a Friday night.
 */
type Row = Record<string, any>
const db: Record<string, Row[]> = {
  orders: [], menu_items: [], settings: [], outbound_messages: [], system_events: [],
}
let seq = 40

export function __reset(seed: { menu_items?: Row[]; settings?: Row[] } = {}) {
  db.orders = []
  db.menu_items = seed.menu_items ?? []
  db.settings = seed.settings ?? []
  db.outbound_messages = []
  db.system_events = []
  seq = 40
}
export function __table(name: string) {
  return db[name]
}

class Query implements PromiseLike<any> {
  private rows: Row[]
  private filters: ((r: Row) => boolean)[] = []
  private cols = '*'
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Row | null = null
  private wantSingle = false   // NOT `single`: a field shadows the method
  private maybe = false
  private orderBy: { col: string; asc: boolean }[] = []
  private lim: number | null = null

  private table: string

  constructor(table: string) {
    this.table = table
    this.rows = db[table] ?? (db[table] = [])
  }

  select(cols = '*'): this { this.cols = cols; return this }
  eq(col: string, v: unknown): this { this.filters.push((r) => String(r[col]) === String(v)); return this }
  neq(col: string, v: unknown): this { this.filters.push((r) => String(r[col]) !== String(v)); return this }
  in(col: string, vs: unknown[]): this {
    const set = new Set(vs.map(String))
    this.filters.push((r) => set.has(String(r[col])))
    return this
  }
  gte(col: string, v: string): this { this.filters.push((r) => String(r[col]) >= String(v)); return this }
  lt(col: string, v: string): this { this.filters.push((r) => String(r[col]) < String(v)); return this }
  or(expr: string): this {
    const parts = expr.split(',').map((p) => {
      const [col, op, ...rest] = p.split('.')
      const val = rest.join('.').replace(/^%|%$/g, '')
      return (r: Row) =>
        op === 'eq'
          ? String(r[col]) === val
          : String(r[col] ?? '').toLowerCase().includes(val.toLowerCase())
    })
    this.filters.push((r) => parts.some((f) => f(r)))
    return this
  }
  order(col: string, o: { ascending?: boolean } = {}): this {
    this.orderBy.push({ col, asc: o.ascending !== false })
    return this
  }
  limit(n: number): this { this.lim = n; return this }
  maybeSingle(): this { this.maybe = true; return this }
  single(): this { this.wantSingle = true; return this }

  insert(payload: Row): this { this.mode = 'insert'; this.payload = payload; return this }
  update(payload: Row): this { this.mode = 'update'; this.payload = payload; return this }
  delete(): this { this.mode = 'delete'; return this }

  private matched() { return this.rows.filter((r) => this.filters.every((f) => f(r))) }

  private run() {
    if (this.mode === 'insert') {
      const p = this.payload!
      // The UNIQUE index the whole idempotency design rests on.
      if (p.idempotency_key && this.rows.some((r) => r.idempotency_key === p.idempotency_key)) {
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
      }
      const row: Row = {
        id: `id-${Math.random().toString(36).slice(2, 10)}`,
        order_no: ++seq,
        created_at: new Date().toISOString(),
        status: 'pending',
        ...p,
        // PostgREST serialises NUMERIC as a string. Handler code must cope.
        total_price: p.total_price != null ? String(p.total_price) : p.total_price,
        phone_digits: String(p.customer_phone ?? '').replace(/[^0-9]/g, ''),
      }
      this.rows.push(row)
      return { data: this.wantSingle ? row : [row], error: null }
    }

    if (this.mode === 'update') {
      const hits = this.matched()
      for (const r of hits) Object.assign(r, this.payload)
      return { data: hits, error: null }
    }

    if (this.mode === 'delete') {
      const hits = this.matched()
      db[this.table] = this.rows.filter((r) => !hits.includes(r))
      return { data: hits, error: null }
    }

    let out = this.matched()
    for (const o of [...this.orderBy].reverse()) {
      out = [...out].sort((a, b) => {
        const x = a[o.col], y = b[o.col]
        return (x > y ? 1 : x < y ? -1 : 0) * (o.asc ? 1 : -1)
      })
    }
    if (this.lim != null) out = out.slice(0, this.lim)
    if (this.maybe) return { data: out[0] ?? null, error: null }
    if (this.wantSingle) {
      return out.length === 1
        ? { data: out[0], error: null }
        : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    }
    return { data: out, error: null }
  }

  /** Full PromiseLike signature — the loose `then(res, rej)` form does not
   *  satisfy the interface and fails typecheck with TS2416. */
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

export function createClient() {
  return { from: (t: string) => new Query(t) }
}
