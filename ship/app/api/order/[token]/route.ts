import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Public order status, by unguessable token.
 *
 * Deliberately returns LESS than the row holds. The customer already knows
 * their own name and number, so echoing them back adds nothing and turns a
 * leaked link into a data disclosure. Status, number, total, items, ETA.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params

  // A token is 32 hex characters. Rate limited anyway, so brute force is not
  // just improbable but slow.
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ ok: false, error: 'Ukendt ordre.' }, { status: 404 })
  }
  const gate = rateLimit(`status:${clientIp(req)}`, { limit: 60, windowMs: 60_000 })
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: 'Prøv igen om lidt.' }, { status: 429 })
  }

  try {
    const db = serviceClient()
    const { data, error } = await db
      .from('orders')
      .select('order_no,status,items,total_price,pickup_minutes,created_at,ready_estimate,cancel_reason')
      .eq('public_token', token)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ ok: false, error: 'Ukendt ordre.' }, { status: 404 })

    return NextResponse.json({
      ok: true,
      order: {
        orderNo: data.order_no,
        status: data.status,
        items: data.items,
        total: Number(data.total_price),
        pickupMinutes: data.pickup_minutes,
        createdAt: data.created_at,
        readyEstimate: data.ready_estimate,
        cancelReason: data.cancel_reason,
      },
    })
  } catch (e) {
    console.error(`[prepnest] order status failed:`, e)
    return NextResponse.json({ ok: false, error: 'Kunne ikke hente ordren.' }, { status: 500 })
  }
}
