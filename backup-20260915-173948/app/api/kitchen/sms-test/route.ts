import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/supabase'
import { STAFF_COOKIE, verifySession } from '@/lib/staff-session'
import { enqueue, smsEnabled } from '@/lib/messaging'
import { isValidDanishMobile, formatDanishPhone } from '@/lib/phone'

/**
 * Sends one test message, so the gateway can be proved before it is pointed at
 * real customers.
 *
 * Without this the only way to test is to place a real order and advance it —
 * which means the first message the setup ever sends goes to someone who is
 * actually waiting for food.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const jar = await cookies()
  if (!(await verifySession(jar.get(STAFF_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, error: 'Ikke logget ind.' }, { status: 401 })
  }

  let phone = ''
  try {
    phone = String((await req.json())?.phone ?? '')
  } catch {
    return NextResponse.json({ ok: false, error: 'Ugyldig anmodning.' }, { status: 400 })
  }
  if (!isValidDanishMobile(phone)) {
    return NextResponse.json({ ok: false, error: 'Telefonnummeret ser ikke rigtigt ud.' }, { status: 400 })
  }

  if (!(await smsEnabled())) {
    return NextResponse.json({
      ok: false,
      error:
        'SMS er ikke slået til endnu. Sæt sms_enabled = true i settings-tabellen, ' +
        'når telefonen er klar.',
    })
  }

  await enqueue({
    channel: 'sms',
    recipient: formatDanishPhone(phone).replace(/\s/g, ''),
    body: 'Ji Sushi: testbesked. Virker det, er SMS-opsætningen på plads.',
    // Unique per send, so testing twice in a row actually sends twice.
    dedupeKey: `test:${Date.now()}`,
    priority: 1,
    ttlMinutes: 15,
  })

  // How long the phone should take to notice, at a 30-second poll.
  const { data } = await serviceClient()
    .from('settings')
    .select('sms_gateway_last_seen')
    .eq('id', 'main')
    .maybeSingle()

  const seen = data?.sms_gateway_last_seen
  const agoMin = seen ? Math.floor((Date.now() - new Date(seen).getTime()) / 60000) : null

  return NextResponse.json({
    ok: true,
    queued: true,
    gatewayLastSeen: seen ?? null,
    note:
      agoMin === null
        ? 'Beskeden ligger i kø, men telefonen har aldrig hentet noget endnu.'
        : agoMin > 5
          ? `Beskeden ligger i kø. Telefonen har ikke hentet i ${agoMin} min — tjek at den er tændt og har signal.`
          : 'Beskeden ligger i kø. Telefonen henter normalt inden for et minut.',
  })
}
