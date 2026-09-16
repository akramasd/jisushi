import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/supabase'
import { STAFF_COOKIE, verifySession } from '@/lib/staff-session'
import { ALLERGEN_CODES } from '@/lib/allergens'

/**
 * Staff review of allergen declarations.
 *
 * Nothing a customer sees as "confirmed" gets there without passing through
 * here. The derivation in lib/allergens.ts only ever proposes.
 */
export const dynamic = 'force-dynamic'

async function authed() {
  const jar = await cookies()
  return verifySession(jar.get(STAFF_COOKIE)?.value)
}
const DENIED = () => NextResponse.json({ ok: false, error: 'Ikke logget ind.' }, { status: 401 })

export async function GET() {
  if (!(await authed())) return DENIED()
  try {
    const db = serviceClient()
    const { data, error } = await db
      .from('menu_items')
      .select('id,name,description,category,allergens,allergens_reviewed,allergen_note,sort_order')
      .order('sort_order')
    if (error) throw error
    return NextResponse.json({ ok: true, items: data ?? [] })
  } catch (e) {
    console.error(`[prepnest] allergens failed:`, e)
    return NextResponse.json({ ok: false, error: 'Kunne ikke hente retter.' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  if (!(await authed())) return DENIED()

  let id = ''
  let allergens: string[] = []
  let note: string | null = null
  try {
    const body = await req.json()
    id = String(body?.id ?? '')
    allergens = Array.isArray(body?.allergens) ? body.allergens.map(String) : []
    note = body?.note ? String(body.note).slice(0, 300) : null
  } catch (e) {
    console.error(`[prepnest] allergens failed:`, e)
    return NextResponse.json({ ok: false, error: 'Ugyldig anmodning.' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ ok: false, error: 'Mangler id.' }, { status: 400 })

  // Reject anything outside the 14. An unrecognised code would be silently
  // dropped at display time and read as "cleared".
  const invalid = allergens.filter((a) => !(ALLERGEN_CODES as string[]).includes(a))
  if (invalid.length) {
    return NextResponse.json(
      { ok: false, error: `Ukendt allergen: ${invalid.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const db = serviceClient()
    const { error } = await db
      .from('menu_items')
      .update({
        allergens: [...new Set(allergens)].sort(),
        allergen_note: note,
        allergens_reviewed: true,
        allergens_reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(`[prepnest] allergens failed:`, e)
    return NextResponse.json({ ok: false, error: 'Kunne ikke gemme.' }, { status: 500 })
  }
}
