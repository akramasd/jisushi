import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/supabase'
import { STAFF_COOKIE, verifySession } from '@/lib/staff-session'
import { record, describeError } from '@/lib/monitor'
import { mirrorToSheet } from '@/lib/sheet-mirror'

/**
 * Menu and trading controls for the owner.
 *
 * Before this, marking an item sold out meant opening the Supabase dashboard —
 * so in practice it happened once and then never again, and customers kept
 * ordering things the kitchen had run out of at six o'clock.
 *
 * Writes go through here rather than the browser because the anon key cannot
 * touch menu_items; a writable price column is a 1 kr sushi box.
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
    const [menu, settings] = await Promise.all([
      db.from('menu_items')
        .select('id,name,price,category,is_available,sort_order')
        .order('sort_order'),
      db.from('settings')
        .select('ordering_paused,pause_message,sms_enabled,webhook_url')
        .eq('id', 'main').maybeSingle(),
    ])
    if (menu.error) throw menu.error
    return NextResponse.json({
      ok: true,
      items: menu.data ?? [],
      settings: settings.data ?? {},
    })
  } catch (e) {
    await record('error', 'menu-admin', describeError(e))
    return NextResponse.json({ ok: false, error: 'Kunne ikke hente menuen.' }, { status: 500 })
  }
}

/**
 * PATCH — one item, or a trading setting.
 *
 *   { id, is_available }        toggle sold out
 *   { id, price }               change a price
 *   { setting: 'ordering_paused', value: true, message?: '...' }
 */
export async function PATCH(req: Request) {
  if (!(await authed())) return DENIED()

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Ugyldig anmodning.' }, { status: 400 })
  }

  try {
    const db = serviceClient()

    // ── trading controls ──
    if (typeof body.setting === 'string') {
      const allowed = ['ordering_paused', 'sms_enabled']
      if (!allowed.includes(body.setting)) {
        return NextResponse.json({ ok: false, error: 'Ukendt indstilling.' }, { status: 400 })
      }
      const patch: Record<string, unknown> = { [body.setting]: Boolean(body.value) }
      if (body.setting === 'ordering_paused') {
        patch.pause_message = String(body.message ?? '').slice(0, 200) || null
      }
      const { error } = await db.from('settings').update(patch).eq('id', 'main')
      if (error) throw error
      await record('info', 'menu-admin', `${body.setting} = ${Boolean(body.value)}`)
      return NextResponse.json({ ok: true })
    }

    // ── a single menu item ──
    const id = String(body.id ?? '')
    if (!id) return NextResponse.json({ ok: false, error: 'Mangler id.' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.is_available === 'boolean') patch.is_available = body.is_available

    if (body.price !== undefined) {
      const price = Number(body.price)
      // A typo in a price field charges every customer that typo. Bound it, and
      // make the refusal explain itself rather than silently clamping.
      if (!Number.isFinite(price) || price < 0 || price > 5000) {
        return NextResponse.json(
          { ok: false, error: 'Prisen skal være mellem 0 og 5000 kr.' },
          { status: 400 },
        )
      }
      patch.price = Math.round(price * 100) / 100
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: 'Intet at ændre.' }, { status: 400 })
    }

    const { data, error } = await db
      .from('menu_items').update(patch).eq('id', id).select('name,price,is_available').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ ok: false, error: 'Retten findes ikke.' }, { status: 404 })

    // Worth a record: a price change is the sort of thing someone asks about
    // three weeks later.
    await record('info', 'menu-admin',
      `${data.name}: ${'price' in patch ? `pris ${data.price} kr` : ''}${
        'is_available' in patch ? ` ${data.is_available ? 'på menuen' : 'udsolgt'}` : ''}`)

    return NextResponse.json({ ok: true, item: data })
  } catch (e) {
    await record('error', 'menu-admin', describeError(e))
    return NextResponse.json({ ok: false, error: 'Kunne ikke gemme.' }, { status: 500 })
  }
}
