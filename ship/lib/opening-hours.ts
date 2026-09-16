import { SITE } from './site'

/**
 * Opening hours, evaluated in Danish local time.
 *
 * This must never use the server's clock directly: Netlify functions run in
 * UTC, so in summer a 21:30 Copenhagen order looks like 19:30 to the server
 * and a 00:30 order looks like the previous day. Everything below is derived
 * from Europe/Copenhagen via Intl, which handles CET/CEST automatically.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

/** Minutes from midnight, per weekday. */
const HOURS: Record<Weekday, { open: number; close: number }> = {
  0: { open: 12 * 60, close: 21 * 60 }, // Søndag
  1: { open: 12 * 60, close: 21 * 60 }, // Mandag
  2: { open: 12 * 60, close: 21 * 60 },
  3: { open: 12 * 60, close: 21 * 60 },
  4: { open: 12 * 60, close: 21 * 60 }, // Torsdag
  5: { open: 12 * 60, close: 22 * 60 }, // Fredag
  6: { open: 12 * 60, close: 22 * 60 }, // Lørdag
}

/**
 * Stop taking new takeaway orders this many minutes before closing, so the
 * kitchen isn't handed a 40-piece box at 21:58.
 */
export const LAST_ORDER_BUFFER_MIN = 20

const DK = 'Europe/Copenhagen'

/** Current wall-clock time in Denmark, regardless of where this runs. */
export function danishNow(now: Date = new Date()): { weekday: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DK,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const map: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const weekday = map[get('weekday')] ?? 0
  const minutes = Number(get('hour')) * 60 + Number(get('minute'))
  return { weekday, minutes }
}

export type OpenState = {
  open: boolean
  /** Open, but too close to closing to accept a new takeaway order. */
  lastOrderPassed: boolean
  opensAt: string
  closesAt: string
}

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export function getOpenState(now: Date = new Date()): OpenState {
  const { weekday, minutes } = danishNow(now)
  const today = HOURS[weekday]
  const open = minutes >= today.open && minutes < today.close
  const lastOrder = today.close - LAST_ORDER_BUFFER_MIN

  return {
    open,
    lastOrderPassed: open && minutes >= lastOrder,
    opensAt: hhmm(today.open),
    closesAt: hhmm(today.close),
  }
}

/** Can a takeaway order be accepted right now? */
export function canAcceptTakeaway(now: Date = new Date()): { ok: boolean; reason?: string } {
  const s = getOpenState(now)
  if (!s.open) {
    return {
      ok: false,
      reason: `Vi har desværre lukket lige nu. Vi åbner igen kl. ${s.opensAt}. Du er velkommen til at ringe på ${SITE.phoneDisplay}.`,
    }
  }
  if (s.lastOrderPassed) {
    return {
      ok: false,
      reason: `Køkkenet er ved at lukke (kl. ${s.closesAt}), så vi tager ikke flere online bestillinger i aften. Ring endelig på ${SITE.phoneDisplay} — måske kan vi nå det.`,
    }
  }
  return { ok: true }
}


const DAY_NAMES: Record<Weekday, string> = {
  1: 'Mandag', 2: 'Tirsdag', 3: 'Onsdag', 4: 'Torsdag',
  5: 'Fredag', 6: 'Lørdag', 0: 'Søndag',
}

/**
 * The opening hours a guest reads, generated from the same table the checkout
 * guard enforces. Derived rather than duplicated: hand-written display strings
 * drift away from the logic the first time someone changes a closing time,
 * and then the site promises hours the system refuses to honour.
 *
 * Consecutive days with identical hours are collapsed — Mon–Thu, Fri–Sat, Sun.
 */
export function displayHours(): { day: string; time: string }[] {
  const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
  const rows: { day: string; time: string }[] = []
  let i = 0

  while (i < order.length) {
    const start = order[i]
    const { open, close } = HOURS[start]
    let j = i
    while (
      j + 1 < order.length &&
      HOURS[order[j + 1]].open === open &&
      HOURS[order[j + 1]].close === close
    ) {
      j++
    }
    const end = order[j]
    rows.push({
      day: i === j ? DAY_NAMES[start] : `${DAY_NAMES[start]} – ${DAY_NAMES[end]}`,
      time: `${hhmm(open)} – ${hhmm(close)}`,
    })
    i = j + 1
  }
  return rows
}

/**
 * The same table in the shape schema.org wants: one row per weekday, 24-hour
 * "HH:MM" strings. Kept beside displayHours() so the machine-readable hours and
 * the human-readable ones can never disagree — they are the same source.
 */
export function structuredHours(): { weekday: number; opens: string; closes: string }[] {
  return ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => ({
    weekday: d,
    opens: hhmm(HOURS[d].open),
    closes: hhmm(HOURS[d].close),
  }))
}
