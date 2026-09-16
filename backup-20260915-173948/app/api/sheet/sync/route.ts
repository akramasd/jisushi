import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { record, describeError } from '@/lib/monitor'
import { notifyCustomer } from '@/lib/messaging'
import { canTransition, type OrderStatus } from '@/lib/order-status'

/**
 * Status changes made in the spreadsheet, coming back the other way.
 *
 * This is what makes the Sheet a two-way surface rather than a dead end. During
 * degraded mode the kitchen works from the Sheet — and without this, a customer
 * whose food is sitting ready would never be told, because the only place that
 * knows is a spreadsheet nobody has connected to anything.
 *
 * Danish status words are accepted, because that is what staff type.
 */
export const dynamic = 'force-dynamic'

const FROM_DANISH: Record<string, OrderStatus> = {
  ny: 'pending', pending: 'pending',
  'i gang': 'accepted', bekræftet: 'accepted', accepted: 'accepted',
  klar: 'ready', ready: 'ready',
  afhentet: 'completed', completed: 'completed',
  annulleret: 'cancelled', afvist: 'cancelled', cancelled: 'cancelled',
}

export async function POST(req: Request) {
  let secret = ''
  let updates: { orderNo: string | number; status: string }[] = []
  try {
    const body = await req.json()
    secret = String(body?.secret ?? '')
    updates = Array.isArray(body?.updates) ? body.updates : []
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }

  const expected = process.env.SHEET_WEBHOOK_SECRET
  if (!expected || expected.length < 16 || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const db = serviceClient()
    let applied = 0

    for (const u of updates.slice(0, 100)) {
      const target = FROM_DANISH[String(u.status).trim().toLowerCase()]
      if (!target) continue

      const { data: row } = await db
        .from('orders')
        .select('id,status,order_no,customer_phone,ready_estimate,cancel_reason')
        .eq('order_no', Number(u.orderNo))
        .maybeSingle()

      // Orders created during an outage exist only in the Sheet; there is
      // nothing here to update, and that is expected rather than an error.
      if (!row) continue
      if (row.status === target) continue

      // The same rules the kitchen screen obeys. A spreadsheet is a text box —
      // it must not be able to move an order somewhere the UI forbids.
      if (!canTransition(row.status as OrderStatus, target)) continue

      const now = new Date().toISOString()
      const patch: Record<string, unknown> = { status: target }
      if (target === 'accepted') patch.accepted_at = now
      if (target === 'ready') patch.ready_at = now
      if (target === 'completed') patch.completed_at = now
      if (target === 'cancelled') patch.cancelled_at = now

      const { data: done } = await db
        .from('orders')
        .update(patch)
        .eq('id', row.id)
        .eq('status', row.status)
        .select('id')

      if (done?.length) {
        applied++
        await notifyCustomer(
          { id: row.id, orderNo: row.order_no, phone: row.customer_phone, reason: row.cancel_reason },
          target,
        )
      }
    }

    return NextResponse.json({ ok: true, applied })
  } catch (e) {
    await record('error', 'sheet-sync', describeError(e))
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
