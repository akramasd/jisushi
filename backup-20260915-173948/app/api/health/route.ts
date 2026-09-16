import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { canAcceptTakeaway } from '@/lib/opening-hours'
import { record, describeError } from '@/lib/monitor'

/**
 * Uptime probe.
 *
 * Distinguishes "not configured" from "cannot reach", because they need
 * completely different fixes and look identical if you only report a failure.
 * A missing env var fails in about a millisecond; a network problem takes tens
 * or hundreds. Reporting the first as "db unreachable" sends whoever is on call
 * to check Supabase's status page when the actual answer is a blank field in
 * the Vercel dashboard.
 *
 * Public on purpose — a health check behind auth cannot be probed by a monitor
 * — so it reveals which env var is missing but never its value.
 */
export const dynamic = 'force-dynamic'

const MISSING_ENV = [
  ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
  ['STAFF_PIN', process.env.STAFF_PIN],
  ['STAFF_SESSION_SECRET', process.env.STAFF_SESSION_SECRET],
] as const

export async function GET() {
  const started = Date.now()

  // Configuration first. There is no point testing a connection that was never
  // configured, and the answer would be misleading if we did.
  const missing = MISSING_ENV.filter(([, v]) => !v).map(([k]) => k)
  if (missing.length > 0) {
    return NextResponse.json(
      {
        status: 'misconfigured',
        db: 'not-configured',
        missing,
        hint: 'Set these in Vercel → Settings → Environment Variables, then redeploy.',
        ms: Date.now() - started,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const { error } = await serviceClient().from('menu_items').select('id').limit(1)
    if (error) throw error

    return NextResponse.json(
      { status: 'ok', db: 'ok', acceptingOrders: canAcceptTakeaway().ok, ms: Date.now() - started },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    await record('error', 'health', `database unreachable: ${describeError(e)}`)
    return NextResponse.json(
      { status: 'degraded', db: 'unreachable', error: describeError(e), ms: Date.now() - started },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
