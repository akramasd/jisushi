import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/supabase'
import { STAFF_COOKIE, verifySession } from '@/lib/staff-session'

/**
 * Has anything bypassed the database recently?
 *
 * If checkout has fallen back to the Sheet, those orders exist and are being
 * cooked — but they are not on the kitchen screen. A screen showing nothing is
 * indistinguishable from a quiet evening, so the kitchen has to be told
 * explicitly where to look.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const jar = await cookies()
  if (!(await verifySession(jar.get(STAFF_COOKIE)?.value))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const since = new Date(Date.now() - 3 * 3_600_000).toISOString()
    const { data } = await serviceClient()
      .from('system_events')
      .select('created_at,message')
      .eq('source', 'checkout')
      .eq('severity', 'error')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const failures = (data ?? []).filter((e) => e.message?.includes('db insert failed'))
    if (failures.length === 0) return NextResponse.json({ ok: true, active: false })

    return NextResponse.json({
      ok: true,
      active: true,
      count: failures.length,
      since: new Date(failures[0].created_at).toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Copenhagen',
      }),
    })
  } catch {
    // If this check cannot run, the database is likely the thing that is down —
    // which is itself the degraded case. Report it rather than staying silent.
    return NextResponse.json({ ok: true, active: true, count: 0, since: 'ukendt' })
  }
}
