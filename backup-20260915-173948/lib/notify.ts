import { serviceClient } from '@/lib/supabase'
import { record, describeError } from '@/lib/monitor'

/**
 * Out-of-band alert when an order lands.
 *
 * The kitchen screen chimes — but only if the tab is open. If the iPad is off,
 * the browser crashed, or someone closed the tab at the end of a shift, an
 * order can arrive with nobody watching. That is the failure this closes.
 *
 * `settings.webhook_url` and `settings.webhook_secret` already existed in the
 * schema with nothing writing to or reading from them. This is what they are
 * for: point them at whatever the restaurant already uses — an SMS gateway,
 * Slack, Make, n8n — and a new order reaches a phone that is not the KDS.
 *
 * Deliberately best-effort. A webhook that is down must never stop an order
 * from being created; the customer's dinner does not depend on Slack.
 */

type OrderPayload = {
  orderNo: number
  customerName: string
  customerPhone: string
  total: number
  pickupMinutes: number | null
  items: { name: string; qty: number }[]
  statusUrl: string
}

/** HMAC-SHA256 over the exact body sent, so the receiver can verify origin. */
async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function notifyNewOrder(order: OrderPayload): Promise<void> {
  try {
    const db = serviceClient()
    const { data: settings } = await db
      .from('settings')
      .select('webhook_url,webhook_secret')
      .eq('id', 'main')
      .maybeSingle()

    const url = settings?.webhook_url
    if (!url || !/^https:\/\//.test(url)) return // https only; no secrets over plaintext

    const body = JSON.stringify({
      event: 'order.created',
      at: new Date().toISOString(),
      order,
      // A one-line summary, so a plain SMS relay needs no template of its own.
      text:
        `Ny ordre #${order.orderNo} — ${order.customerName}, ${order.customerPhone}. ` +
        `${order.items.reduce((n, i) => n + i.qty, 0)} varer, ${order.total} kr. ` +
        `Afhentning om ${order.pickupMinutes ?? 30} min.`,
    })

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (settings?.webhook_secret) {
      headers['X-Prepnest-Signature'] = `sha256=${await sign(body, settings.webhook_secret)}`
    }

    // Short deadline: this runs inside the customer's request. A hanging
    // webhook must not become a hanging checkout.
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 3000)
    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal: ac.signal })
      if (!res.ok) {
        // Still swallowed for the customer, but recorded: an alert channel that
        // has quietly died is exactly the thing nobody notices until a busy night.
        await record('warn', 'notify', `webhook returned ${res.status}`)
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    await record('warn', 'notify', `webhook failed: ${describeError(e)}`)
  }
}
