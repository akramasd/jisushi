import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/supabase'
import { STAFF_COOKIE, verifySession } from '@/lib/staff-session'
import { canTransition, STATUSES, type OrderStatus } from '@/lib/order-status'
import { notifyCustomer } from '@/lib/messaging'
import { mirrorToSheet } from '@/lib/sheet-mirror'

/**
 * The kitchen's data path.
 *
 * Orders are not readable with the anon key — it ships to every browser, so
 * anon read access on `orders` meant every customer's phone number was public.
 * Middleware already gates /kitchen, but this re-checks: middleware protects
 * pages, and an API route is a different path.
 */
export const dynamic = 'force-dynamic'

const FIELDS =
  'id,order_no,customer_name,customer_phone,items,total_price,pickup_minutes,created_at,status,accepted_at,ready_at,completed_at,cancelled_at,cancel_reason,ready_estimate'

async function authed(): Promise<boolean> {
  const jar = await cookies()
  return verifySession(jar.get(STAFF_COOKIE)?.value)
}

const DENIED = () => NextResponse.json({ ok: false, error: 'Ikke logget ind.' }, { status: 401 })

/**
 * GET ?view=active   — the pass: everything not yet finished
 *     ?view=history  — 30 days back, newest first
 *     &q=            — order number, name, or phone
 */
export async function GET(req: Request) {
  if (!(await authed())) return DENIED()

  const url = new URL(req.url)
  const view = url.searchParams.get('view') === 'history' ? 'history' : 'active'
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 40)

  try {
    const db = serviceClient()
    let query = db.from('orders').select(FIELDS)

    if (view === 'active') {
      query = query.in('status', ['pending', 'accepted', 'ready']).order('created_at', { ascending: true })
    } else {
      // Matches the 30-day retention window: the UI never promises a row that
      // the purge has already taken away.
      const from = new Date(Date.now() - 30 * 86_400_000).toISOString()
      query = query.gte('created_at', from).order('created_at', { ascending: false }).limit(500)
    }

    if (q) {
      const digits = q.replace(/\D/g, '')
      // Commas and dots break PostgREST's `or` grammar, so keep them out of it.
      const safeName = q.replace(/[,().*]/g, ' ').trim()
      const clauses: string[] = []
      if (safeName) clauses.push(`customer_name.ilike.%${safeName}%`)
      // A bare number is far more often an order number than part of a name.
      if (/^\d+$/.test(q) && Number(q) <= 2147483647) clauses.push(`order_no.eq.${Number(q)}`)
      // Against phone_digits, NOT customer_phone: the raw value keeps whatever
      // spacing the customer typed, so "31 33 44 86" never matched "31334486".
      if (digits.length >= 4) clauses.push(`phone_digits.like.%${digits}%`)
      if (clauses.length) query = query.or(clauses.join(','))
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, orders: data ?? [], view })
  } catch (e) {
    console.error(`[prepnest] kitchen orders failed:`, e)
    return NextResponse.json({ ok: false, error: 'Kunne ikke hente ordrer.' }, { status: 500 })
  }
}

/**
 * PATCH — advance an order.
 *
 * Transitions are validated against the current row, not against what the
 * client believes. A kitchen tab left open on a stale render must not be able
 * to un-cancel an order or mark an unconfirmed one as collected.
 */
/**
 * GDPR erasure.
 *
 * The privacy policy promises a customer can have their details removed on
 * request. This is the button that keeps that promise — without it the promise
 * is one the kitchen cannot act on.
 *
 * Anonymises rather than deletes: the order itself is business record and
 * bookkeeping, the name and number are the personal data. Blanking them
 * satisfies erasure while leaving the till reconcilable.
 */
export async function DELETE(req: Request) {
  if (!(await authed())) return DENIED()

  let phone = ''
  try {
    phone = String((await req.json())?.phone ?? '').replace(/[^0-9]/g, '')
  } catch {
    return NextResponse.json({ ok: false, error: 'Ugyldig anmodning.' }, { status: 400 })
  }
  if (phone.length < 8) {
    return NextResponse.json({ ok: false, error: 'Skriv hele telefonnummeret.' }, { status: 400 })
  }

  try {
    const db = serviceClient()
    const { data, error } = await db
      .from('orders')
      .update({
        customer_name: 'Slettet på anmodning',
        customer_phone: '00000000',
      })
      .eq('phone_digits', phone)
      .select('id')

    if (error) throw error
    return NextResponse.json({ ok: true, anonymised: data?.length ?? 0 })
  } catch (e) {
    console.error(`[prepnest] erasure failed:`, e)
    return NextResponse.json({ ok: false, error: 'Kunne ikke slette.' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  if (!(await authed())) return DENIED()

  let id = ''
  let status = ''
  let reason = ''
  let etaMinutes: number | null = null
  try {
    const body = await req.json()
    id = String(body?.id ?? '')
    status = String(body?.status ?? '')
    reason = String(body?.reason ?? '').slice(0, 200)
    etaMinutes = body?.etaMinutes == null ? null : Number(body.etaMinutes)
  } catch (e) {
    console.error(`[prepnest] kitchen orders failed:`, e)
    return NextResponse.json({ ok: false, error: 'Ugyldig anmodning.' }, { status: 400 })
  }

  if (!id) return NextResponse.json({ ok: false, error: 'Mangler ordre-id.' }, { status: 400 })
  if (!STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ ok: false, error: 'Ugyldig status.' }, { status: 400 })
  }

  try {
    const db = serviceClient()
    const { data: current, error: readErr } = await db
      .from('orders')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (readErr) throw readErr
    if (!current) return NextResponse.json({ ok: false, error: 'Ordren findes ikke.' }, { status: 404 })

    const from = current.status as OrderStatus
    const to = status as OrderStatus
    if (from === to) return NextResponse.json({ ok: true, unchanged: true })
    if (!canTransition(from, to)) {
      return NextResponse.json(
        { ok: false, error: `Kan ikke gå fra "${from}" til "${to}".`, current: from },
        { status: 409 },
      )
    }

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { status: to }
    if (to === 'accepted') {
      patch.accepted_at = now
      if (etaMinutes && Number.isFinite(etaMinutes) && etaMinutes > 0 && etaMinutes <= 240) {
        patch.ready_estimate = new Date(Date.now() + etaMinutes * 60_000).toISOString()
      }
    }
    if (to === 'ready') patch.ready_at = now
    if (to === 'completed') patch.completed_at = now
    if (to === 'cancelled') {
      patch.cancelled_at = now
      patch.cancel_reason = reason || 'Annulleret af køkkenet.'
    }

    // Conditional on the status we validated against. Two staff tapping
    // "Bekræft" at once — or one double-tap on a laggy iPad — both passed the
    // read-then-write check above and both wrote. Adding .eq('status', from)
    // makes the database the arbiter: the second update matches zero rows.
    const { data: updated, error } = await db
      .from('orders')
      .update(patch)
      .eq('id', id)
      .eq('status', from)
      .select('id')

    if (error) throw error
    if (!updated || updated.length === 0) {
      // Someone else moved it first. Not an error worth alarming the pass over —
      // report the truth so the screen can resync.
      const { data: now } = await db.from('orders').select('status').eq('id', id).maybeSingle()
      return NextResponse.json(
        { ok: false, raced: true, current: now?.status, error: 'Ordren blev opdateret af en anden.' },
        { status: 409 },
      )
    }
    // The order moved. Tell the customer, and keep the Sheet in step.
    //
    // Both are best-effort and neither is awaited for its result beyond
    // enqueueing: the kitchen tapped a button and must see it respond, not wait
    // on a text message.
    const { data: full } = await db
      .from('orders')
      .select('id,order_no,customer_phone,customer_name,items,total_price,pickup_minutes,ready_estimate,cancel_reason')
      .eq('id', id)
      .maybeSingle()

    if (full) {
      await notifyCustomer(
        {
          id: full.id,
          orderNo: full.order_no,
          phone: full.customer_phone,
          readyAt: full.ready_estimate
            ? new Date(full.ready_estimate).toLocaleTimeString('da-DK', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen',
              })
            : null,
          reason: full.cancel_reason,
        },
        to,
      )

      // Same order id, so the Sheet updates the existing row rather than
      // appending a second copy.
      await mirrorToSheet({
        id: String(full.order_no),
        orderNo: full.order_no,
        customerName: full.customer_name,
        customerPhone: full.customer_phone,
        items: (full.items ?? []) as { name: string; qty: number }[],
        total: Number(full.total_price),
        pickupMinutes: full.pickup_minutes,
        status: to,
        source: 'Hjemmeside',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(`[prepnest] kitchen orders failed:`, e)
    return NextResponse.json({ ok: false, error: 'Kunne ikke opdatere ordren.' }, { status: 500 })
  }
}
