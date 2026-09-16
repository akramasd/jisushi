import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { canAcceptTakeaway } from '@/lib/opening-hours'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { notifyNewOrder } from '@/lib/notify'
import { record, describeError } from '@/lib/monitor'
import { mirrorToSheet } from '@/lib/sheet-mirror'
import { priceOrder, normalisePickup, MAX_DISTINCT_ITEMS } from '@/lib/pricing'
import { isValidDanishMobile, formatDanishPhone } from '@/lib/phone'

type IncomingItem = { id: string; qty: number }

/** Unguessable handle for the customer's status page. */
function publicToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Creates a takeaway order.
 *
 * Written for the realistic customer: on mobile data, fifteen minutes away,
 * on a connection that may drop between the request leaving and the response
 * arriving. Three things follow from that.
 *
 *  1. Idempotency. A retry carrying the same key returns the ORIGINAL order
 *     rather than creating a second one. Without it, a dropped response and a
 *     second tap means the kitchen cooks two dinners and someone eats the cost.
 *  2. Line merging. The same item posted twice is merged before pricing, so
 *     the 99-per-line clamp cannot be multiplied by repeating the line.
 *  3. Every price re-read from the database. The client's numbers are input.
 */
export async function POST(req: Request) {
  const gate = rateLimit(`checkout:${clientIp(req)}`, { limit: 8, windowMs: 60_000 })
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: 'For mange bestillinger på kort tid. Vent et øjeblik, eller ring til os.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSec) } },
    )
  }

  try {
    const body = await req.json()
    const rawItems: IncomingItem[] = Array.isArray(body?.items) ? body.items : []
    const name = String(body?.name ?? '').trim()
    const phone = String(body?.phone ?? '').trim()
    const pickupRaw = Number(body?.pickupMinutes ?? 0)
    const idemKey = String(body?.idempotencyKey ?? '').slice(0, 64)

    if (rawItems.length === 0) {
      return NextResponse.json({ ok: false, error: 'Din kurv er tom.' }, { status: 400 })
    }
    if (rawItems.length > MAX_DISTINCT_ITEMS) {
      return NextResponse.json(
        { ok: false, error: 'Meget stor bestilling — ring til os, så tager vi den sammen.' },
        { status: 400 },
      )
    }
    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: 'Skriv venligst dit navn.' }, { status: 400 })
    }
    if (!isValidDanishMobile(phone)) {
      return NextResponse.json({ ok: false, error: 'Telefonnummeret ser ikke rigtigt ud.' }, { status: 400 })
    }
    if (!idemKey) {
      return NextResponse.json({ ok: false, error: 'Ugyldig anmodning.' }, { status: 400 })
    }
    const pickupMinutes = normalisePickup(pickupRaw)

    const db = serviceClient()

    // Replay check BEFORE anything else. A retry must not be rejected for being
    // outside opening hours when the original arrived while they were open.
    const { data: existing } = await db
      .from('orders')
      .select('order_no,total_price,public_token,status')
      .eq('idempotency_key', idemKey)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        ok: true,
        replay: true,
        orderNo: existing.order_no,
        total: Number(existing.total_price),
        token: existing.public_token,
        status: existing.status,
      })
    }

    // The owner's manual pause, checked before opening hours: if the kitchen has
    // stopped, saying "we're open until 21:00" is worse than useless.
    const { data: trading } = await db
      .from('settings')
      .select('ordering_paused,pause_message')
      .eq('id', 'main')
      .maybeSingle()

    if (trading?.ordering_paused) {
      return NextResponse.json(
        {
          ok: false,
          error:
            trading.pause_message ||
            'Vi tager desværre ikke imod online bestillinger lige nu. Ring til os, så finder vi ud af det.',
          closed: true,
        },
        { status: 409 },
      )
    }

    const hours = canAcceptTakeaway()
    if (!hours.ok) {
      return NextResponse.json({ ok: false, error: hours.reason, closed: true }, { status: 409 })
    }

    const { data: menu, error: menuErr } = await db
      .from('menu_items')
      .select('id,name,price,is_available')
      .in('id', [...new Set((rawItems as { id: unknown }[]).map((i) => String(i?.id)))])

    if (menuErr) {
      await record('error', 'checkout', 'menu lookup failed', { code: menuErr.code })
      return NextResponse.json({ ok: false, error: 'Kunne ikke hente menuen.' }, { status: 500 })
    }

    // Pricing lives in lib/pricing.ts as pure functions, exercised directly by
    // tests/pricing.test.ts against adversarial input. Inside a route handler
    // this logic could only be reached through a database and a network.
    const priced = priceOrder(rawItems, menu ?? [])
    if (!priced.ok) {
      const message: Record<typeof priced.reason, string> = {
        empty: 'Din kurv er tom.',
        too_many: 'Meget stor bestilling — ring til os, så tager vi den sammen.',
        sold_out: `Desværre udsolgt: ${priced.detail}. Fjern dem og prøv igen.`,
        missing: 'En vare findes ikke længere.',
        bad_price: 'Der er noget galt med prisen på en vare. Ring til os.',
      }
      const status = priced.reason === 'empty' || priced.reason === 'too_many' ? 400 : 409
      if (priced.reason === 'sold_out' || priced.reason === 'missing') {
        // Several of these a night usually means an item was 86'd and forgotten.
        await record('warn', 'checkout', `order rejected: ${priced.reason}`, { detail: priced.detail })
      }
      return NextResponse.json({ ok: false, error: message[priced.reason] }, { status })
    }

    const { lines, total } = priced
    const token = publicToken()

    const { data: order, error } = await db
      .from('orders')
      .insert({
        customer_name: name,
        customer_phone: formatDanishPhone(phone),
        items: lines,
        total_price: total,
        status: 'pending',
        pickup_minutes: pickupMinutes,
        idempotency_key: idemKey,
        public_token: token,
        channel: 'takeaway',
      })
      .select('order_no,public_token')
      .single()

    if (error) {
      // 23505 = unique violation: two retries raced each other. The other one
      // won, so read its result back rather than reporting a failure for an
      // order that exists.
      if ((error as { code?: string }).code === '23505') {
        const { data: raced } = await db
          .from('orders')
          .select('order_no,total_price,public_token,status')
          .eq('idempotency_key', idemKey)
          .maybeSingle()
        if (raced) {
          return NextResponse.json({
            ok: true,
            replay: true,
            orderNo: raced.order_no,
            total: Number(raced.total_price),
            token: raced.public_token,
            status: raced.status,
          })
        }
      }
      // ─── Degraded mode ───
      //
      // The database refused the write. Until now that meant a 500 and a lost
      // order: the customer chose their food, typed their number, tapped send,
      // and got nothing — while the restaurant never learned an order existed.
      //
      // The Sheet mirror does not depend on the database. If it accepts the
      // order, the kitchen can see it and cook it, so the order is real even
      // though the database does not know about it. Tell the customer the truth:
      // received, but ring to confirm.
      await record('error', 'checkout', `db insert failed: ${describeError(error)}`)

      const fallbackNo = `N${Date.now().toString().slice(-6)}`
      const mirrored = await mirrorToSheet({
        id: idemKey,
        orderNo: fallbackNo,
        customerName: name,
        customerPhone: formatDanishPhone(phone),
        items: lines.map((l) => ({ name: l.name, qty: l.qty })),
        total,
        pickupMinutes,
        status: 'Ny',
        source: 'NØDSPOR (database nede)',
      })

      if (mirrored) {
        await notifyNewOrder({
          orderNo: fallbackNo as unknown as number,
          customerName: name,
          customerPhone: formatDanishPhone(phone),
          total,
          pickupMinutes,
          items: lines.map((l) => ({ name: l.name, qty: l.qty })),
          statusUrl: '',
        })
        return NextResponse.json({
          ok: true,
          degraded: true,
          orderNo: fallbackNo,
          total,
          token: null,
          status: 'pending',
        })
      }

      // Nothing caught it. Say so plainly and give them the phone number —
      // a customer who thinks an order went through and gets no food is worse
      // off than one who knows to ring.
      return NextResponse.json(
        { ok: false, error: 'Bestillingen kunne ikke gemmes. Ring til os, så tager vi den over telefonen.' },
        { status: 500 },
      )
    }

    // Copy to the Sheet and fire the alert. Both swallow their own failures and
    // cap their own time, so neither can turn a good order into a bad one.
    await mirrorToSheet({
      id: String(order!.order_no),
      orderNo: order!.order_no,
      customerName: name,
      customerPhone: formatDanishPhone(phone),
      items: lines.map((l) => ({ name: l.name, qty: l.qty })),
      total,
      pickupMinutes,
      status: 'Ny',
      source: 'Hjemmeside',
    })

    await notifyNewOrder({
      orderNo: order!.order_no,
      customerName: name,
      customerPhone: phone,
      total,
      pickupMinutes,
      items: lines.map((l) => ({ name: l.name, qty: l.qty })),
      statusUrl: `${new URL(req.url).origin}/ordre/${order!.public_token}`,
    })

    return NextResponse.json({
      ok: true,
      orderNo: order?.order_no,
      total,
      token: order?.public_token,
      status: 'pending',
    })
  } catch (e) {
    // Log the cause. A 500 that swallows its own reason turns a five-minute fix
    // into an evening of guesswork, and the customer sees the same message
    // either way.
    // A failed checkout is a lost order. It must be visible without anyone
    // having to go looking for it.
    await record('error', 'checkout', describeError(e))
    return NextResponse.json({ ok: false, error: 'Uventet fejl. Prøv igen.' }, { status: 500 })
  }
}
