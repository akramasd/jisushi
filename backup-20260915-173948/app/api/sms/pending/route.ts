import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { record, describeError } from '@/lib/monitor'

/**
 * The Android SMS gateway polls this for messages to send.
 *
 * Claim-then-confirm rather than fire-and-forget: this endpoint marks messages
 * `claimed` and hands them over; the phone reports back to /api/sms/report once
 * they are actually sent. A message the phone took but never sent gets released
 * after five minutes and offered to the next poll.
 *
 * The alternative — delete on read — loses the message if the phone dies
 * between receiving and sending, which is exactly when it matters.
 *
 * Auth: a bearer token, because the phone cannot hold a browser session.
 */
export const dynamic = 'force-dynamic'

function authorised(req: Request): boolean {
  const secret = process.env.SMS_GATEWAY_SECRET
  if (!secret || secret.length < 20) return false
  const header = req.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '')
  // Constant-time-ish: avoid leaking the token length by early return.
  if (token.length !== secret.length) return false
  let diff = 0
  for (let i = 0; i < secret.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i)
  return diff === 0
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const db = serviceClient()

    // Free anything a previous phone claimed and never confirmed.
    await db.rpc('release_stale_claims', { older_than_minutes: 5 }).then(
      () => {},
      () => {}, // best effort; a failure here must not stop the poll
    )

    // Heartbeat. Without it, a phone that quietly stopped polling looks exactly
    // like an evening with no messages to send.
    await db.from('settings').update({ sms_gateway_last_seen: new Date().toISOString() }).eq('id', 'main')

    // Expire anything past its shelf life BEFORE handing work out. This is what
    // stops a gateway connected weeks later from texting people about meals
    // they ate in September.
    const now = new Date().toISOString()
    await db
      .from('outbound_messages')
      .update({ status: 'skipped', skip_reason: 'For gammel til at sende' })
      .eq('status', 'pending')
      .lt('expires_at', now)

    const { data: queued, error } = await db
      .from('outbound_messages')
      .select('id,recipient,body,attempts')
      .eq('status', 'pending')
      .eq('channel', 'sms')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw error
    if (!queued?.length) return NextResponse.json({ ok: true, messages: [] })

    const ids = queued.map((m) => m.id)
    await db
      .from('outbound_messages')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .in('id', ids)

    return NextResponse.json({
      ok: true,
      messages: queued.map((m) => ({ id: m.id, to: m.recipient, text: m.body })),
    })
  } catch (e) {
    await record('error', 'sms-gateway', `poll failed: ${describeError(e)}`)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
