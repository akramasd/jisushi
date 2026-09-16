import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { getOpenState, canAcceptTakeaway, danishNow, displayHours, structuredHours } from '../lib/opening-hours.ts'

/** A real instant in UTC, so the timezone maths is genuinely exercised. */
const utc = (iso: string) => new Date(iso)

describe('Danish local time, from a UTC server', () => {
  test('summer: CEST is UTC+2', () => {
    // 18:00 UTC on a July Friday is 20:00 in Copenhagen.
    const { weekday, minutes } = danishNow(utc('2026-07-17T18:00:00Z'))
    assert.equal(weekday, 5, 'Friday')
    assert.equal(minutes, 20 * 60)
  })

  test('winter: CET is UTC+1', () => {
    const { minutes } = danishNow(utc('2026-01-16T18:00:00Z'))
    assert.equal(minutes, 19 * 60)
  })

  test('the DST switch does not shift opening hours', () => {
    // Last Sunday of March 2026: clocks go forward at 02:00.
    const before = danishNow(utc('2026-03-29T00:30:00Z'))
    const after = danishNow(utc('2026-03-29T01:30:00Z'))
    assert.equal(before.minutes, 90)   // 01:30 CET
    assert.equal(after.minutes, 210)   // 03:30 CEST — an hour vanished, correctly
  })

  test('late evening UTC does not roll the weekday early', () => {
    // 23:00 UTC Saturday is already 01:00 Sunday in Denmark.
    const { weekday } = danishNow(utc('2026-07-18T23:00:00Z'))
    assert.equal(weekday, 0, 'Sunday in Copenhagen, still Saturday in UTC')
  })
})

describe('accepting orders', () => {
  test('open mid-afternoon', () => {
    assert.equal(canAcceptTakeaway(utc('2026-07-17T13:00:00Z')).ok, true) // 15:00 DK
  })

  test('closed before opening', () => {
    const r = canAcceptTakeaway(utc('2026-07-17T07:00:00Z')) // 09:00 DK
    assert.equal(r.ok, false)
    assert.match(r.reason!, /åbner igen/)
  })

  test('closed after closing', () => {
    assert.equal(canAcceptTakeaway(utc('2026-07-16T20:30:00Z')).ok, false) // 22:30 Thu
  })

  test('last-order buffer stops a 40-piece box at 21:58', () => {
    // Thursday closes 21:00; buffer is 20 min, so 20:50 DK is refused.
    const r = canAcceptTakeaway(utc('2026-07-16T18:50:00Z'))
    assert.equal(r.ok, false)
    assert.match(r.reason!, /ved at lukke/)
  })

  test('Friday stays open an hour later than Thursday', () => {
    const thu = canAcceptTakeaway(utc('2026-07-16T19:15:00Z')) // 21:15 Thu — shut
    const fri = canAcceptTakeaway(utc('2026-07-17T19:15:00Z')) // 21:15 Fri — open
    assert.equal(thu.ok, false)
    assert.equal(fri.ok, true)
  })

  test('the minute of opening counts as open', () => {
    assert.equal(getOpenState(utc('2026-07-17T10:00:00Z')).open, true) // 12:00 sharp
  })

  test('the minute of closing counts as closed', () => {
    assert.equal(getOpenState(utc('2026-07-17T20:00:00Z')).open, false) // 22:00 sharp
  })
})

describe('published hours match enforced hours', () => {
  test('every weekday is represented exactly once', () => {
    const days = structuredHours()
    assert.equal(days.length, 7)
    assert.equal(new Set(days.map((d) => d.weekday)).size, 7)
  })

  test('structured hours are valid schema.org times', () => {
    for (const d of structuredHours()) {
      assert.match(d.opens, /^\d{2}:\d{2}$/)
      assert.match(d.closes, /^\d{2}:\d{2}$/)
      assert.ok(d.opens < d.closes, 'opens before it closes')
    }
  })

  test('display hours collapse identical days without losing any', () => {
    const rows = displayHours()
    assert.ok(rows.length < 7, 'consecutive identical days are grouped')
    assert.ok(rows.some((r) => /Fredag/.test(r.day)))
    assert.ok(rows.some((r) => /Søndag/.test(r.day)))
  })

  test('what the site advertises is what checkout enforces', () => {
    // Friday: published closing time must equal the state machine's.
    const published = structuredHours().find((d) => d.weekday === 5)!
    const enforced = getOpenState(utc('2026-07-17T13:00:00Z'))
    assert.equal(published.closes, enforced.closesAt)
    assert.equal(published.opens, enforced.opensAt)
  })
})
