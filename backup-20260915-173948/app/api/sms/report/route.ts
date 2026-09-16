import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { record, describeError } from '@/lib/monitor'

/**
 * The phone reports what it managed to send.
 *
 *   POST { results: [{ id, sent: true }, { id, sent: false, error: "..." }] }
 *
 * A failure goes back to `pending` with the attempt counted, so it is retried
 * — until five attempts, after which it is marked `failed` and shown in the
 * kitchen's system check rather than retried into the void.
 */
export const dynamic = 'force-dynamic'

function authorised(req: Request): boolean {
  const secret = process.env.SMS_GATEWAY_SECRET
  if (!secret || secret.length < 20) return false
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (token.length !== secret.length) return false
  let diff = 0
  for (let i = 0; i < secret.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i)
  return diff === 0
}

export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let results: { id: string; sent: boolean; error?: string }[] = []
  try {
    const body = await req.json()
    results = Array.isArray(body?.results) ? body.results : []
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }
  if (results.length === 0) return NextResponse.json({ ok: true, updated: 0 })

  try {
    const db = serviceClient()
    let updated = 0

    for (const r of results.slice(0, 50)) {
      if (!r?.id) continue

      if (r.sent) {
        await db
          .from('outbound_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
          .eq('id', r.id)
      } else {
        // Read the attempt count so the row decides its own fate rather than
        // the phone deciding it.
        const { data: row } = await db
          .from('outbound_messages')
          .select('attempts')
          .eq('id', r.id)
          .maybeSingle()

        const attempts = (row?.attempts ?? 0) + 1
        await db
          .from('outbound_messages')
          .update({
            status: attempts >= 5 ? 'failed' : 'pending',
            attempts,
            claimed_at: null,
            last_error: String(r.error ?? 'unknown').slice(0, 200),
          })
          .eq('id', r.id)

        if (attempts >= 5) {
          await record('warn', 'sms-gateway', 'message failed after 5 attempts', { id: r.id })
        }
      }
      updated++
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    await record('error', 'sms-gateway', `report failed: ${describeError(e)}`)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
