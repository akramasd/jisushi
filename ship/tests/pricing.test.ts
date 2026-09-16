import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  priceOrder, mergeItems, round2, normalisePickup, toPrice,
  type MenuRow,
} from '../lib/pricing.ts'

const MENU: MenuRow[] = [
  { id: 'a3f2b1c4-9d8e-4f1a-b2c3-d4e5f6a7b8c9', name: 'California (8 stk.)', price: 79, is_available: true },
  { id: 'b4e3c2d5-0e9f-5a2b-c3d4-e5f6a7b8c9d0', name: 'Spicy Laks (8 stk.)', price: 83, is_available: true },
  { id: 'c5d4e3f6-1f0a-6b3c-d4e5-f6a7b8c9d0e1', name: 'Edamame', price: 45, is_available: false },
  { id: 'd6e5f4a7-2a1b-7c4d-e5f6-a7b8c9d0e1f2', name: 'Halv portion', price: '39.50', is_available: true },
]
const ID = MENU.map((m) => m.id)

describe('the UUID bug that made ordering impossible', () => {
  test('matches ids as strings, not numbers', () => {
    const r = priceOrder([{ id: ID[0], qty: 2 }], MENU)
    assert.equal(r.ok, true)
    // Number('a3f2b1c4-…') is NaN and NaN === NaN is false, so a numeric
    // comparison here yields zero lines and an empty, uncheckoutable cart.
    assert.equal(r.ok && r.lines.length, 1)
    assert.equal(r.ok && r.total, 158)
  })
})

describe('quantity ceiling cannot be multiplied', () => {
  test('duplicate ids merge before clamping', () => {
    // 20 lines x 99 each. Clamping per line and summing gives 1,980.
    const items = Array.from({ length: 20 }, () => ({ id: ID[0], qty: 99 }))
    const r = priceOrder(items, MENU)
    assert.equal(r.ok, true)
    assert.equal(r.ok && r.lines.length, 1)
    assert.equal(r.ok && r.lines[0].qty, 99, 'ceiling holds after merge')
    assert.equal(r.ok && r.total, 79 * 99)
  })

  test('merges then clamps rather than clamping then merging', () => {
    const r = priceOrder([{ id: ID[0], qty: 60 }, { id: ID[0], qty: 60 }], MENU)
    assert.equal(r.ok && r.lines[0].qty, 99)
  })
})

describe('adversarial input', () => {
  for (const [label, qty] of [
    ['negative', -5], ['zero', 0], ['NaN', NaN], ['Infinity', Infinity],
    ['string', 'abc'], ['null', null], ['fractional', 0.4],
  ] as const) {
    test(`${label} qty is discarded, never priced`, () => {
      const r = priceOrder([{ id: ID[0], qty }], MENU)
      assert.equal(r.ok, false, `${label} produced a priceable line`)
      assert.equal(!r.ok && r.reason, 'empty')
    })
  }

  test('a fractional qty above 1 floors rather than inflating', () => {
    const r = priceOrder([{ id: ID[0], qty: 2.9 }], MENU)
    assert.equal(r.ok && r.lines[0].qty, 2)
  })

  test('unknown id is rejected, not silently dropped', () => {
    const r = priceOrder([{ id: 'not-a-real-id', qty: 1 }], MENU)
    assert.equal(!r.ok && r.reason, 'missing')
  })

  test('client-supplied price is ignored entirely', () => {
    const r = priceOrder([{ id: ID[0], qty: 1, price: 1, sum: 1, name: 'gratis' } as never], MENU)
    assert.equal(r.ok && r.lines[0].price, 79)
    assert.equal(r.ok && r.lines[0].name, 'California (8 stk.)')
  })

  test('non-array body does not throw', () => {
    for (const bad of [null, undefined, 'items', 42, {}]) {
      assert.equal(priceOrder(bad, MENU).ok, false)
    }
  })

  test('__proto__ as an id cannot poison the merge map', () => {
    const r = priceOrder([{ id: '__proto__', qty: 1 }], MENU)
    assert.equal(!r.ok && r.reason, 'missing')
    assert.equal(({} as Record<string, unknown>).polluted, undefined)
  })
})

describe('sold out', () => {
  test('an 86ed item stops the whole order', () => {
    const r = priceOrder([{ id: ID[0], qty: 1 }, { id: ID[2], qty: 1 }], MENU)
    assert.equal(!r.ok && r.reason, 'sold_out')
    assert.equal(!r.ok && r.detail, 'Edamame')
  })
})

describe('money arithmetic', () => {
  test('NUMERIC arriving as a string still prices correctly', () => {
    const r = priceOrder([{ id: ID[3], qty: 2 }], MENU)
    assert.equal(r.ok && r.total, 79)
  })

  test('no float drift on repeated addition', () => {
    assert.equal(round2(0.1 + 0.2), 0.3)
    const r = priceOrder([{ id: ID[3], qty: 3 }], MENU)
    assert.equal(r.ok && r.total, 118.5)
  })

  test('a corrupt price fails loudly instead of charging NaN', () => {
    const bad: MenuRow[] = [{ id: 'x', name: 'Broken', price: 'not-a-number', is_available: true }]
    const r = priceOrder([{ id: 'x', qty: 1 }], bad)
    assert.equal(!r.ok && r.reason, 'bad_price')
  })

  test('a negative price in the database is refused', () => {
    const bad: MenuRow[] = [{ id: 'x', name: 'Wrong', price: -50, is_available: true }]
    assert.equal(priceOrder([{ id: 'x', qty: 1 }], bad).ok, false)
  })
})

describe('pickup window', () => {
  test('only offered windows survive', () => {
    assert.equal(normalisePickup(15), 15)
    assert.equal(normalisePickup(60), 60)
  })
  test('a negative window would mark every order late on the pass', () => {
    assert.equal(normalisePickup(-30), 30)
  })
  test('an absurd window would hide a genuinely late order', () => {
    assert.equal(normalisePickup(99999), 30)
    assert.equal(normalisePickup('60; DROP TABLE orders'), 30)
  })
})
