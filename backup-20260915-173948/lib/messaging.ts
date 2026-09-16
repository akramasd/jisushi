import { serviceClient } from '@/lib/supabase'
import { record, describeError } from '@/lib/monitor'
import { formatDanishPhone, isValidDanishMobile } from '@/lib/phone'
import type { OrderStatus } from '@/lib/order-status'

/**
 * What the system says to people, and when.
 *
 * ── Designed to sit dormant ──
 *
 * The site can launch with no SMS gateway at all. Messages are still decided
 * and recorded; they are simply marked `skipped` instead of `pending`. Connect
 * an Android phone weeks later, flip `settings.sms_enabled`, and messaging
 * starts — with no backlog to flush.
 *
 * That last part matters more than it sounds. Without it, switching on the
 * gateway after three months would text hundreds of people "din ordre er klar"
 * about meals they ate in September. One such message teaches a customer to
 * ignore every text you will ever send them.
 *
 * Belt and braces: every message also carries `expires_at`. Even if the enabled
 * flag were wrong, nothing stale can go out.
 */

export type Channel = 'sms' | 'webhook' | 'email'

type EnqueueArgs = {
  channel?: Channel
  recipient: string
  body: string
  /** Same key twice = sent once. */
  dedupeKey?: string
  priority?: number
  orderId?: string
  /**
   * How long this message is still worth sending.
   *
   * A pickup-ready text is useless after the meal; a fault alert about
   * something that broke on Tuesday is noise on Friday. Past this, the gateway
   * never picks it up.
   */
  ttlMinutes: number
}

/**
 * Cached briefly — read on every status change, and it rarely moves.
 *
 * The consequence, worth knowing: flipping `sms_enabled` in Supabase takes up
 * to this long to take effect. Configurable so a test suite need not wait a
 * real minute to prove the flag works.
 */
let smsState: { enabled: boolean; at: number } | null = null
const CACHE_MS = Number(process.env.SMS_STATE_CACHE_MS ?? 60_000)

export async function smsEnabled(): Promise<boolean> {
  if (smsState && Date.now() - smsState.at < CACHE_MS) return smsState.enabled
  try {
    const { data } = await serviceClient()
      .from('settings')
      .select('sms_enabled')
      .eq('id', 'main')
      .maybeSingle()
    smsState = { enabled: Boolean(data?.sms_enabled), at: Date.now() }
    return smsState.enabled
  } catch {
    // Unknown means do not send. A missed text is a small harm; an unexpected
    // one to a customer is a larger one.
    return false
  }
}

export async function enqueue(args: EnqueueArgs): Promise<boolean> {
  const live = args.channel === 'sms' || !args.channel ? await smsEnabled() : true
  const expiresAt = new Date(Date.now() + args.ttlMinutes * 60_000).toISOString()

  try {
    const { error } = await serviceClient().from('outbound_messages').insert({
      channel: args.channel ?? 'sms',
      recipient: args.recipient,
      body: args.body.slice(0, 480),
      dedupe_key: args.dedupeKey ?? null,
      priority: args.priority ?? 5,
      order_id: args.orderId ?? null,
      expires_at: expiresAt,
      // Recorded, not queued. You can read back a week of what WOULD have been
      // sent before pointing a real phone at real customers.
      status: live ? 'pending' : 'skipped',
      skip_reason: live ? null : 'SMS-gateway ikke aktiveret endnu',
    })
    // 23505 means we already queued this exact thing. That is the dedupe index
    // doing its job, not a failure.
    if (error && (error as { code?: string }).code !== '23505') throw error
    return true
  } catch (e) {
    await record('warn', 'messaging', `enqueue failed: ${describeError(e)}`)
    return false
  }
}

// ─────────────────────────────────────────────── customer messages

/**
 * Which status changes are worth a text.
 *
 * Not all of them. "Modtaget" arrives while the customer is still looking at
 * the confirmation screen, and a message telling someone what they can already
 * see is how a restaurant teaches people to ignore its texts.
 */
const CUSTOMER_SMS: Partial<Record<OrderStatus, (o: OrderCtx) => string>> = {
  accepted: (o) =>
    `Ji Sushi: Vi har bekræftet din ordre #${o.orderNo}` +
    (o.readyAt ? ` og forventer den klar kl. ${o.readyAt}.` : '.') +
    ' Vi ringer, hvis der er noget.',
  ready: (o) =>
    `Ji Sushi: Din ordre #${o.orderNo} er klar til afhentning i Lodsgade 10. Vi ses!`,
  cancelled: (o) =>
    `Ji Sushi: Din ordre #${o.orderNo} er desværre annulleret.` +
    (o.reason ? ` ${o.reason}` : '') +
    ' Ring til os på 31 33 44 86, hvis det er en fejl.',
}

/**
 * How long each kind of message stays worth sending.
 *
 * "Klar til afhentning" that lands two hours late is worse than none: the
 * customer either collected long ago or gave up, and either way the message is
 * confusing. A cancellation stays useful much longer — it explains an absence.
 */
const TTL: Partial<Record<OrderStatus, number>> = {
  accepted: 45,      // a confirmation nobody sees within the hour has been overtaken
  ready: 120,        // the food is cold well before this
  cancelled: 1440,   // still worth knowing tomorrow
}

type OrderCtx = {
  id: string
  orderNo: number | string
  phone: string
  readyAt?: string | null
  reason?: string | null
}

/** Texts the customer when their order genuinely changes. */
export async function notifyCustomer(order: OrderCtx, status: OrderStatus): Promise<void> {
  const template = CUSTOMER_SMS[status]
  if (!template) return

  // A malformed number would sit in the queue failing forever.
  if (!isValidDanishMobile(order.phone)) {
    await record('info', 'messaging', 'skipped SMS: not a Danish mobile', { orderNo: order.orderNo })
    return
  }

  await enqueue({
    channel: 'sms',
    recipient: formatDanishPhone(order.phone).replace(/\s/g, ''),
    body: template(order),
    // One text per order per status, no matter how many times it is set.
    dedupeKey: `order:${order.id}:${status}`,
    priority: status === 'ready' ? 1 : 3,
    orderId: order.id,
    ttlMinutes: TTL[status] ?? 60,
  })
}

// ─────────────────────────────────────────────── owner alerts

/**
 * Tells the owner something is wrong.
 *
 * Rate-limited by dedupe key to one per hour per kind of problem. An alert that
 * fires forty times during one outage is an alert that gets muted, and a muted
 * alert is worse than none.
 */
export async function alertOwner(kind: string, message: string): Promise<void> {
  const to = process.env.OWNER_PHONE
  if (!to) return

  const hour = new Date().toISOString().slice(0, 13) // yyyy-mm-ddThh
  await enqueue({
    channel: 'sms',
    recipient: to.replace(/\s/g, ''),
    body: `PREPNEST: ${message}`.slice(0, 300),
    dedupeKey: `alert:${kind}:${hour}`,
    priority: 1,
    // An alert about something that broke on Tuesday is noise on Friday.
    ttlMinutes: 180,
  })
}
