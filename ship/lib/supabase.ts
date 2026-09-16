import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.warn('[prepnest] Supabase env vars mangler — bestilling virker ikke uden dem.')
}

/**
 * Browser/anon client. Read-only in practice: RLS grants anon SELECT on
 * menu_items and nothing else. Every write goes through a server route.
 */
export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anon ?? 'placeholder')

/**
 * Service-role client. Server-only — it bypasses RLS entirely.
 *
 * Throws rather than silently falling back to the anon key: a route that
 * quietly downgrades to anon fails later, deeper, and more confusingly than one
 * that refuses to start.
 */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL mangler')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler')
  return createClient(url, key, { auth: { persistSession: false } })
}

export type MenuItem = {
  /** UUID. The schema uses gen_random_uuid() — this was typed as `number`,
   *  which made `Number(id)` NaN and silently emptied every cart. */
  id: string
  name: string
  description: string | null
  price: number
  category: string
  /** Matches the column name in schema.sql. The kitchen calls this "86'ing" an item. */
  is_available: boolean
  /** Paper-menu position. Ordering by `id` is ordering by a random UUID. */
  sort_order: number | null
  /** EU 1169/2011 declarable allergens. See lib/allergens.ts. */
  allergens: string[] | null
  /** False until the kitchen confirms. Unconfirmed is shown as "ask us". */
  allergens_reviewed: boolean | null
  allergen_note: string | null
  /** confirmed | standard | uncertain — see lib/allergens.ts */
  allergen_confidence: string | null
}
