import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/supabase'
import { STAFF_COOKIE, verifySession } from '@/lib/staff-session'

/**
 * Self-test, runnable from a phone.
 *
 * Runs the same checks as scripts/preflight.mjs, but server-side and behind the
 * staff login — so an owner with nothing but a phone can verify a deployment
 * without a terminal.
 *
 * Staff-gated on purpose: it reports the shape of your security posture, which
 * is not something to publish. Read-only apart from one temporary row that it
 * deletes before returning.
 */
export const dynamic = 'force-dynamic'

type Check = { name: string; status: 'pass' | 'fail' | 'warn'; detail: string }

export async function GET() {
  const jar = await cookies()
  if (!(await verifySession(jar.get(STAFF_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, error: 'Ikke logget ind.' }, { status: 401 })
  }

  const checks: Check[] = []
  const add = (name: string, status: Check['status'], detail: string) =>
    checks.push({ name, status, detail })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // ---------------------------------------------------------- config
  add('Miljøvariabler', url && anon ? 'pass' : 'fail',
      url && anon ? 'Supabase er konfigureret.' : 'Supabase-nøgler mangler.')
  add('Personale-login', process.env.STAFF_SESSION_SECRET && process.env.STAFF_PIN ? 'pass' : 'fail',
      'Du er logget ind, så koden virker.')
  add('Automatisk oprydning', process.env.CRON_SECRET ? 'pass' : 'warn',
      process.env.CRON_SECRET
        ? 'Ordrer slettes automatisk efter 30 dage.'
        : 'CRON_SECRET mangler — gamle ordrer slettes ikke automatisk.')

  if (!url || !anon) return NextResponse.json({ ok: true, checks })

  const db = serviceClient()

  // ---------------------------------------------------------- schema
  try {
    const { error } = await db
      .from('orders')
      .select('idempotency_key,public_token,phone_digits,ready_estimate,accepted_at')
      .limit(1)
    error
      ? add('Databasen er opdateret', 'fail', 'schema.sql skal køres igen — kolonner mangler.')
      : add('Databasen er opdateret', 'pass', 'Alle nødvendige kolonner findes.')
  } catch {
    add('Databasen er opdateret', 'fail', 'Kunne ikke læse orders-tabellen.')
  }

  // ---------------------------------------------------------- menu
  try {
    const { data } = await db.from('menu_items').select('name,sort_order,is_available')
    const rows = data ?? []
    if (rows.length === 0) add('Menuen', 'fail', 'Menuen er tom — kunder ser ingenting.')
    else {
      const unsorted = rows.filter((r) => r.sort_order == null || r.sort_order >= 9000).length
      add('Menuen', unsorted === 0 ? 'pass' : 'warn',
          `${rows.length} retter${unsorted ? `, ${unsorted} uden fast rækkefølge` : ' i korrekt rækkefølge'}.`)
      const off = rows.filter((r) => r.is_available === false)
      if (off.length) add('Udsolgte retter', 'warn',
          `${off.length} markeret udsolgt: ${off.slice(0, 4).map((r) => r.name).join(', ')}`)
    }
  } catch {
    add('Menuen', 'fail', 'Kunne ikke læse menuen.')
  }

  // ---------------------------------------------------------- RLS, tried for real
  //
  // The anon key is in every visitor's browser. This uses it exactly as an
  // attacker would, and reports what actually happens.
  const asAnon = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/rest/v1/${path}`, {
      ...init,
      signal: AbortSignal.timeout(8000),
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    })

  try {
    const read = await asAnon('orders?select=customer_name,customer_phone&limit=3')
    const rows = read.ok ? await read.json() : []
    add('Kundedata er beskyttet', rows.length > 0 ? 'fail' : 'pass',
        rows.length > 0
          ? `ALVORLIGT: den offentlige nøgle kan læse ${rows.length} kunders navn og telefon. Kør schema.sql igen.`
          : 'Den offentlige nøgle kan ikke læse ordrer.')

    const write = await asAnon('menu_items', {
      method: 'POST',
      body: JSON.stringify({ name: `SELFTEST ${Date.now()}`, price: 1, category: 'test' }),
    })
    add('Priser kan ikke ændres udefra', write.ok ? 'fail' : 'pass',
        write.ok ? 'ALVORLIGT: priser kan ændres fra enhver browser. Kør schema.sql igen.'
                 : 'Kun serveren kan ændre priser.')

    const menu = await asAnon('menu_items?select=id&limit=1')
    add('Menuen er offentlig', menu.ok ? 'pass' : 'fail',
        menu.ok ? 'Kunder kan se menuen.' : 'Menuen kan ikke læses — takeaway-siden vil være tom.')
  } catch {
    add('Sikkerhedstjek', 'warn', 'Kunne ikke gennemføre sikkerhedstjekket.')
  }

  // ---------------------------------------------------------- duplicate protection
  try {
    const key = `selftest-${Date.now()}`
    const row = {
      customer_name: 'SELFTEST', customer_phone: '00000000',
      items: [], total_price: 0, status: 'cancelled', idempotency_key: key,
    }
    const first = await db.from('orders').insert(row).select('id,phone_digits').single()
    if (first.error) {
      add('Dobbelt-bestilling forhindres', 'warn', 'Kunne ikke teste — prøv igen.')
    } else {
      const second = await db.from('orders').insert(row).select('id')
      add('Dobbelt-bestilling forhindres',
          (second.error as { code?: string })?.code === '23505' ? 'pass' : 'fail',
          (second.error as { code?: string })?.code === '23505'
            ? 'En afbrudt forbindelse kan ikke skabe to ordrer.'
            : 'ALVORLIGT: dårlig forbindelse kan skabe dobbelte ordrer. Kør schema.sql igen.')

      add('Søgning på telefonnummer', first.data?.phone_digits === '00000000' ? 'pass' : 'fail',
          first.data?.phone_digits === '00000000'
            ? 'Historik kan findes på telefonnummer.'
            : 'phone_digits mangler — søgning på telefon finder intet.')

      await db.from('orders').delete().eq('id', first.data!.id)
    }
  } catch {
    add('Dobbelt-bestilling forhindres', 'warn', 'Kunne ikke gennemføre testen.')
  }

  // ---------------------------------------------------------- alerts
  try {
    const { data } = await db.from('settings').select('webhook_url').eq('id', 'main').maybeSingle()
    add('Besked når køkkenskærmen er lukket', data?.webhook_url ? 'pass' : 'warn',
        data?.webhook_url
          ? 'Nye ordrer sendes videre, også hvis skærmen er slukket.'
          : 'Ingen webhook. Hvis køkkenskærmen er lukket, opdager ingen nye ordrer.')
  } catch {
    add('Besked når køkkenskærmen er lukket', 'warn', 'Kunne ikke læse indstillinger.')
  }

  // ---------------------------------------------------------- today
  try {
    const since = new Date(Date.now() - 86_400_000).toISOString()
    const { data } = await db.from('orders').select('status').gte('created_at', since)
    const rows = data ?? []
    add('Seneste døgn', 'pass',
        rows.length === 0
          ? 'Ingen ordrer det seneste døgn.'
          : `${rows.length} ordre(r): ${rows.filter((r) => r.status === 'pending').length} nye, ` +
            `${rows.filter((r) => r.status === 'completed').length} afhentet.`)
  } catch {
    add('Seneste døgn', 'warn', 'Kunne ikke tælle ordrer.')
  }

  // ---------------------------------------------------------- recent problems
  //
  // The part that turns a one-off check into monitoring: what has actually gone
  // wrong since yesterday, in plain Danish, on a phone.
  try {
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString()
    const { data } = await db
      .from('system_events')
      .select('severity,source,message,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    const events = data ?? []
    const errors = events.filter((e) => e.severity === 'error')
    const warnings = events.filter((e) => e.severity === 'warn')

    if (errors.length === 0 && warnings.length === 0) {
      add('Fejl det seneste døgn', 'pass', 'Ingen. Systemet har kørt uden problemer.')
    } else {
      if (errors.length > 0) {
        add('Fejl det seneste døgn', 'fail',
            `${errors.length} fejl. Nyeste: ${errors[0].source} — ${errors[0].message}`)
      }
      if (warnings.length > 0) {
        add('Advarsler det seneste døgn', 'warn',
            `${warnings.length}. Nyeste: ${warnings[0].source} — ${warnings[0].message}`)
      }
    }
  } catch {
    add('Fejllog', 'warn', 'Kunne ikke læse fejlloggen — kør schema.sql igen.')
  }

  // ---------------------------------------------------------- allergens
  try {
    const { data } = await db.from('menu_items').select('allergen_confidence')
    const rows = data ?? []
    const uncertain = rows.filter((r) => r.allergen_confidence === 'uncertain').length
    const confirmed = rows.filter((r) => r.allergen_confidence === 'confirmed').length
    add('Allergenoplysninger', uncertain > rows.length / 4 ? 'warn' : 'pass',
        `${rows.length - uncertain} af ${rows.length} retter har allergenoplysninger. ` +
        `${confirmed} bekræftet af køkkenet. ${uncertain} siger "ring til os".`)
  } catch {
    add('Allergenoplysninger', 'warn', 'Kunne ikke læses — kør schema.sql igen.')
  }

  // ---------------------------------------------------------- SMS
  //
  // Reports three distinct states rather than pass/fail, because "not set up
  // yet" is a legitimate way to run and must not look like a fault.
  try {
    const { data } = await db
      .from('settings')
      .select('sms_enabled,sms_gateway_last_seen')
      .eq('id', 'main')
      .maybeSingle()

    if (!data?.sms_enabled) {
      const { count } = await db
        .from('outbound_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'skipped')
      add('SMS til kunder', 'warn',
          `Ikke slået til endnu. ${count ?? 0} besked(er) er noteret, men ikke sendt — ` +
          'de sendes ikke bagudrettet, når I tænder for det.')
    } else {
      const seen = data.sms_gateway_last_seen
      const agoMin = seen ? Math.floor((Date.now() - new Date(seen).getTime()) / 60000) : null
      const { count: waiting } = await db
        .from('outbound_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (agoMin === null) {
        add('SMS til kunder', 'fail', 'Slået til, men telefonen har aldrig hentet beskeder.')
      } else if (agoMin > 15) {
        add('SMS til kunder', 'fail',
            `Telefonen har ikke hentet i ${agoMin} min. ${waiting ?? 0} besked(er) venter. ` +
            'Tjek at den er tændt, opladt og har signal.')
      } else {
        add('SMS til kunder', 'pass',
            `Telefonen hentede for ${agoMin} min siden. ${waiting ?? 0} i kø.`)
      }
    }
  } catch {
    add('SMS til kunder', 'warn', 'Kunne ikke læse SMS-status.')
  }

  const failed = checks.filter((c) => c.status === 'fail').length
  return NextResponse.json({ ok: true, checks, failed, ranAt: new Date().toISOString() })
}
