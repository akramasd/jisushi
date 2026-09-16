import { record, describeError } from '@/lib/monitor'

/**
 * Mirrors every order to a Google Sheet as it is created.
 *
 * Not a failover switch — a continuous copy. The distinction matters: a backup
 * you only write to during an outage is a backup nobody has ever tested, and
 * the outage is the worst moment to discover it does not work.
 *
 * What this gives you:
 *   · a backup, which the Supabase free tier does not provide
 *   · a record the owner can read without a database client
 *   · a kitchen view that still works if the website is down
 *
 * Best-effort by construction. A dead Sheet must never fail a real order.
 */

export type MirrorOrder = {
  id?: string
  orderNo: number | string
  customerName: string
  customerPhone: string
  items: { name: string; qty: number }[]
  total: number
  pickupMinutes?: number | null
  status?: string
  createdAt?: string
  source?: string
}

export async function mirrorToSheet(order: MirrorOrder): Promise<boolean> {
  const url = process.env.SHEET_WEBHOOK_URL
  if (!url) return false

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Short: this runs inside the customer's request. Apps Script is not fast,
      // but it is not allowed to be slow enough to matter.
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        secret: process.env.SHEET_WEBHOOK_SECRET ?? '',
        order: { ...order, createdAt: order.createdAt ?? new Date().toISOString() },
      }),
    })
    if (!res.ok) {
      await record('warn', 'sheet-mirror', `sheet returned ${res.status}`)
      return false
    }
    return true
  } catch (e) {
    // A silent backup failure is how you find out at the worst moment that the
    // backup has been broken for a month.
    await record('warn', 'sheet-mirror', describeError(e))
    return false
  }
}
