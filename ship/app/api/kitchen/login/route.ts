import { NextResponse } from 'next/server'
import { signSession, STAFF_COOKIE, SESSION_DAYS, staffAuthConfigured } from '@/lib/staff-session'
import { clientIp } from '@/lib/rate-limit'
import { serviceClient } from '@/lib/supabase'
import { alertOwner } from '@/lib/messaging'
import { record } from '@/lib/monitor'

/**
 * Exchanges the staff PIN for a signed session cookie.
 *
 * ── Why the limiting lives in the database ──
 *
 * This used to use the in-memory limiter. On serverless that is per instance:
 * "5 attempts per 10 minutes" is really 5 per instance, and Vercel spreads
 * requests across many. Against a 4-digit PIN — 10,000 combinations — that is
 * not a defence, it is a speed bump.
 *
 * Shared state gives one counter regardless of which instance answers.
 *
 * ── Why there is no global lockout ──
 *
 * Locking every login after N failures would let a stranger take the kitchen
 * offline during service from a phone in a car park. Instead: block the
 * offending IP, and alert the owner the moment a pattern appears. A staff
 * member who knows the PIN can always get in.
 */
export const dynamic = 'force-dynamic'

const IP_FAILURE_LIMIT = 5
const GLOBAL_ALERT_THRESHOLD = 25
const WINDOW_MINUTES = 15

export async function POST(req: Request) {
  if (!staffAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Personale-login er ikke sat op på denne installation.' },
      { status: 503 },
    )
  }

  const ip = clientIp(req)
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 200)
  let db: ReturnType<typeof serviceClient> | null = null

  try {
    db = serviceClient()
    const { data } = await db.rpc('recent_auth_failures', { p_ip: ip, p_minutes: WINDOW_MINUTES })
    const row = Array.isArray(data) ? data[0] : data
    const ipFailures = Number(row?.ip_failures ?? 0)
    const globalFailures = Number(row?.global_failures ?? 0)

    if (ipFailures >= IP_FAILURE_LIMIT) {
      return NextResponse.json(
        { ok: false, error: `For mange forsøg. Prøv igen om ${WINDOW_MINUTES} minutter.` },
        { status: 429, headers: { 'Retry-After': String(WINDOW_MINUTES * 60) } },
      )
    }

    // Distributed guessing shows as many failures from many addresses. Blocking
    // each one individually never triggers, so the pattern itself is the signal.
    if (globalFailures >= GLOBAL_ALERT_THRESHOLD) {
      await alertOwner(
        'login-attack',
        `${globalFailures} mislykkede login-forsøg på ${WINDOW_MINUTES} min. Overvej at skifte personalekoden.`,
      )
    }
  } catch {
    // If the check itself cannot run, fall through and still verify the PIN.
    // Refusing every login because the counter is unavailable would lock the
    // kitchen out over a database blip.
    await record('warn', 'login', 'attempt-limit check unavailable; PIN still enforced')
  }

  let pin = ''
  try {
    pin = String((await req.json())?.pin ?? '')
  } catch {
    return NextResponse.json({ ok: false, error: 'Ugyldig anmodning.' }, { status: 400 })
  }

  const expected = String(process.env.STAFF_PIN)
  let diff = pin.length === expected.length ? 0 : 1
  for (let i = 0; i < Math.max(pin.length, expected.length); i++) {
    diff |= (pin.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0)
  }
  const ok = diff === 0

  // Record before responding, so a failure counts even if the client vanishes.
  try {
    await db?.from('auth_attempts').insert({ ip, ok, user_agent: ua })
  } catch {
    /* recording is best-effort; the PIN check above is what protects */
  }

  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Forkert kode.' }, { status: 401 })
  }

  const token = await signSession()
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Login er ikke konfigureret.' }, { status: 503 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  })
  return res
}

/** Sign out — used by the "Log ud" control on the kitchen screen. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(STAFF_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
