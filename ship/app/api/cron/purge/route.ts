import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

/**
 * Deletes orders older than 30 days.
 *
 * Two reasons pointing the same way. The kitchen needs last week's order to
 * settle a dispute; nobody needs last year's. And these rows are names and
 * phone numbers — under GDPR, keeping personal data beyond the purpose that
 * justified collecting it is the violation, so a fixed window is the compliant
 * answer as well as the useful one.
 *
 * Schedule it in vercel.json. Protected by CRON_SECRET so the endpoint cannot
 * be triggered by anyone who finds the URL.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET mangler.' }, { status: 503 })
  }

  // Vercel Cron sends this header; a manual call can pass ?key= instead.
  const auth = req.headers.get('authorization')
  const key = new URL(req.url).searchParams.get('key')
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ ok: false, error: 'Ikke autoriseret.' }, { status: 401 })
  }

  try {
    const db = serviceClient()
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const { data, error } = await db.from('orders').delete().lt('created_at', cutoff).select('id')
    if (error) throw error

    // The event log follows the same 30-day window, or it grows without bound.
    const { data: events } = await db
      .from('system_events').delete().lt('created_at', cutoff).select('id')

    return NextResponse.json({
      ok: true,
      removed: data?.length ?? 0,
      eventsRemoved: events?.length ?? 0,
      cutoff,
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'Oprydning fejlede.' }, { status: 500 })
  }
}
