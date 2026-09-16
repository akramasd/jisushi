/**
 * The money path, as pure functions.
 *
 * Pulled out of the route handler on purpose. Inside a route it can only be
 * exercised by standing up a database and a network; out here it is ordinary
 * code that a test can call directly with adversarial input. Every bug this
 * project has shipped — a UUID compared as a number, a clamp applied per line
 * instead of per item — lived in logic exactly like this.
 *
 * Nothing here touches I/O. The route fetches, this decides.
 */

export type MenuRow = { id: string; name: string; price: number | string; is_available: boolean }
export type IncomingItem = { id: unknown; qty: unknown }
export type OrderLine = { id: string; name: string; qty: number; price: number; sum: number }

/** Pickup windows offered in the UI. Anything else is a tampered request. */
export const PICKUP_CHOICES = [15, 30, 45, 60] as const
export const DEFAULT_PICKUP = 30

/** Per-item ceiling. Applied AFTER merging, never per submitted line. */
export const MAX_QTY_PER_ITEM = 99
export const MAX_DISTINCT_ITEMS = 60

/**
 * Merges duplicate ids, then clamps once.
 *
 * Clamping each submitted line and summing lets a caller post the same item
 * twenty times at qty 99 and walk past a ceiling of 99 with 1,980 units.
 * Merge first, clamp second — the order is the whole point.
 */
export function mergeItems(raw: unknown): Map<string, number> {
  const merged = new Map<string, number>()
  if (!Array.isArray(raw)) return merged

  for (const entry of raw as IncomingItem[]) {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : String(entry?.id ?? '').trim()
    const qty = Math.floor(Number(entry?.qty))
    // NaN, Infinity, 0, negatives and empty ids all fall out here rather than
    // becoming a line worth -400 kr.
    if (!id || id === 'undefined' || id === 'null') continue
    if (!Number.isFinite(qty) || qty <= 0) continue
    merged.set(id, (merged.get(id) ?? 0) + qty)
  }
  return merged
}

/** Postgres NUMERIC arrives as a string over PostgREST often enough to matter. */
export function toPrice(v: number | string): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export type PriceResult =
  | { ok: true; lines: OrderLine[]; total: number }
  | { ok: false; reason: 'empty' | 'too_many' | 'sold_out' | 'missing' | 'bad_price'; detail?: string }

/**
 * Re-prices an order from the database rows. The client's numbers never appear
 * in the output — only ids and quantities survive the trip.
 */
export function priceOrder(rawItems: unknown, menu: MenuRow[]): PriceResult {
  const merged = mergeItems(rawItems)
  if (merged.size === 0) return { ok: false, reason: 'empty' }
  if (merged.size > MAX_DISTINCT_ITEMS) return { ok: false, reason: 'too_many' }

  // Compared as strings. `id` is a UUID; `Number(uuid)` is NaN, and NaN === NaN
  // is false, so a numeric comparison here silently matches nothing.
  const byId = new Map(menu.map((m) => [String(m.id), m]))

  const soldOut: string[] = []
  for (const id of merged.keys()) {
    const row = byId.get(id)
    if (row && !row.is_available) soldOut.push(row.name)
  }
  if (soldOut.length > 0) return { ok: false, reason: 'sold_out', detail: soldOut.join(', ') }

  const lines: OrderLine[] = []
  for (const [id, wanted] of merged) {
    const row = byId.get(id)
    if (!row) return { ok: false, reason: 'missing', detail: id }

    const price = toPrice(row.price)
    if (Number.isNaN(price)) return { ok: false, reason: 'bad_price', detail: row.name }

    const qty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, wanted))
    lines.push({ id: String(row.id), name: row.name, qty, price, sum: round2(price * qty) })
  }

  return { ok: true, lines, total: round2(lines.reduce((s, l) => s + l.sum, 0)) }
}

/**
 * Kroner to two decimals without float drift.
 *
 * 0.1 + 0.2 is 0.30000000000000004 in binary floating point. Sushi prices are
 * whole kroner today, so this is invisible — until someone adds a 12,50 item
 * and a receipt reads 137,49999999.
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Restricts pickup to an offered window. */
export function normalisePickup(v: unknown): number {
  const n = Number(v)
  return (PICKUP_CHOICES as readonly number[]).includes(n) ? n : DEFAULT_PICKUP
}
