import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveAllergens, displayFor, shouldHide, ALLERGEN_CODES, isAllergenCode,
} from '../lib/allergens.ts'

/**
 * These tests encode a safety property, not a preference: an item whose
 * allergens nobody has checked must never be presented to a customer as safe.
 */

describe('the 14 declarable allergens', () => {
  test('all fourteen are present', () => {
    assert.equal(ALLERGEN_CODES.length, 14)
  })
  test('the ones sushi actually hits are covered', () => {
    for (const c of ['fisk', 'krebsdyr', 'soja', 'sesam', 'gluten', 'aeg', 'maelk', 'sennep']) {
      assert.ok(isAllergenCode(c), `${c} missing`)
    }
  })
})

describe('derivation from real menu text', () => {
  const cases: [string, string, string[]][] = [
    ['Laks (8 stk.)', 'Laks, avocado og agurk', ['fisk']],
    ['California (8 stk.)', 'Surimi, avocado, agurk og sesamfrø', ['gluten', 'aeg', 'fisk', 'sesam']],
    ['Tempura Rejer Tun Deluxe Roll (8 stk.)',
      'Tempura rejer, avocado og agurk, toppet med tun og spicy mayo',
      ['gluten', 'krebsdyr', 'aeg', 'fisk']],
    ['Alaska (8 stk.)', 'Laks, flødeost, avocado, agurk og tobiko', ['fisk', 'maelk']],
    ['Super California (8 stk.)', 'Krebsehaler, avocado, agurk og tobiko', ['krebsdyr', 'fisk']],
    ['Inari Tofu', '', ['soja']],
    ['Edamame bønner', '', ['soja']],
    ['Rejechips', '', ['krebsdyr']],
    ['Goma dressing', '', ['soja', 'sesam']],
    ['Hjemmelavet teriyaki', '', ['gluten', 'soja']],
    ['Hjemmelavet wasabi-mayo', '', ['aeg', 'sennep']],
    ['Tangsalat', '', ['soja', 'sesam']],
    ['Miso suppe', '', ['gluten', 'soja']],
  ]

  for (const [name, desc, expected] of cases) {
    test(`${name}`, () => {
      const got = deriveAllergens(name, desc).allergens
      for (const e of expected) {
        assert.ok(got.includes(e as never), `expected ${e} in [${got.join(', ')}]`)
      }
    })
  }

  test('plain vegetables declare nothing', () => {
    assert.deepEqual(deriveAllergens('Agurk (8 stk.)', 'Agurk').allergens, [])
    assert.deepEqual(deriveAllergens('Avocado', '').allergens, [])
  })

  test('plain meat declares nothing from the 14', () => {
    assert.deepEqual(deriveAllergens('Kyllingefilet', '').allergens, [])
    assert.deepEqual(deriveAllergens('Oksekød', '').allergens, [])
  })

  test('it explains itself, so staff can check the reasoning', () => {
    const d = deriveAllergens('Tempura Rejer', '')
    assert.ok(d.reasons.length > 0)
    assert.ok(d.reasons.some((r) => /skaldyr|frituredej/.test(r)))
  })

  test('surimi is caught as fish AND wheat, not just fish', () => {
    // Surimi is the classic under-declaration: it looks like crab, it is white
    // fish bound with wheat starch.
    const got = deriveAllergens('California', 'Surimi, avocado').allergens
    assert.ok(got.includes('fisk'))
    assert.ok(got.includes('gluten'))
  })
})

describe('what the customer is shown — the safety property', () => {
  test('an unreviewed item says "ask", never "contains nothing"', () => {
    const d = displayFor({ allergens: ['fisk'], allergens_reviewed: false })
    assert.equal(d.state, 'ask', 'unverified data was shown as if confirmed')
  })

  test('an unreviewed item with an EMPTY list still says "ask"', () => {
    // The dangerous case: no data looks identical to no allergens.
    const d = displayFor({ allergens: [], allergens_reviewed: false })
    assert.equal(d.state, 'ask')
  })

  test('a reviewed item with no allergens is explicitly cleared', () => {
    const d = displayFor({ allergens: [], allergens_reviewed: true })
    assert.equal(d.state, 'none-declared')
  })

  test('a reviewed item lists what it contains', () => {
    const d = displayFor({ allergens: ['fisk', 'sesam'], allergens_reviewed: true })
    assert.equal(d.state, 'declared')
    assert.deepEqual(d.state === 'declared' && d.allergens, ['fisk', 'sesam'])
  })

  test('junk in the column is discarded, not rendered', () => {
    const d = displayFor({ allergens: ['fisk', 'not-an-allergen'], allergens_reviewed: true })
    assert.deepEqual(d.state === 'declared' && d.allergens, ['fisk'])
  })
})

describe('filtering, when someone is avoiding an allergen', () => {
  const reviewedFish = { allergens: ['fisk'], allergens_reviewed: true }
  const reviewedClean = { allergens: [], allergens_reviewed: true }
  const unreviewed = { allergens: ['soja'], allergens_reviewed: false }

  test('no filter hides nothing', () => {
    assert.equal(shouldHide(reviewedFish, []), false)
    assert.equal(shouldHide(unreviewed, []), false)
  })

  test('a matching allergen is hidden', () => {
    assert.equal(shouldHide(reviewedFish, ['fisk']), true)
  })

  test('a cleared item stays visible', () => {
    assert.equal(shouldHide(reviewedClean, ['fisk']), true === false)
  })

  test('UNREVIEWED items are hidden when filtering — the whole point', () => {
    // Showing an unchecked dish to someone avoiding fish is exactly the failure
    // this module exists to prevent.
    assert.equal(shouldHide(unreviewed, ['fisk']), true)
    assert.equal(shouldHide(unreviewed, ['noedder']), true)
  })

  test('filtering on several allergens hides an item matching any one', () => {
    assert.equal(shouldHide({ allergens: ['sesam'], allergens_reviewed: true }, ['fisk', 'sesam']), true)
  })
})

describe('the standard-recipe tier', () => {
  const standardFish = { allergens: ['fisk'], allergens_reviewed: false, allergen_confidence: 'standard' }
  const standardClean = { allergens: [], allergens_reviewed: false, allergen_confidence: 'standard' }
  const unknowable = { allergens: [], allergens_reviewed: false, allergen_confidence: 'uncertain' }

  test('a standard-recipe dish declares, and says so', () => {
    const d = displayFor(standardFish)
    assert.equal(d.state, 'declared')
    assert.equal(d.state === 'declared' && d.confidence, 'standard')
  })

  test('a confirmed dish outranks whatever confidence was stored', () => {
    const d = displayFor({ allergens: ['fisk'], allergens_reviewed: true, allergen_confidence: 'standard' })
    assert.equal(d.state === 'declared' && d.confidence, 'confirmed')
  })

  test('an unknowable dish still says "ask", never a list', () => {
    assert.equal(displayFor(unknowable).state, 'ask')
    // Even if someone put allergens on it, uncertain wins — the point of the
    // flag is that the data cannot be trusted.
    assert.equal(displayFor({ ...unknowable, allergens: ['fisk'] }).state, 'ask')
  })

  test('a missing confidence field defaults to "ask", not to "safe"', () => {
    // Old rows, or a failed migration, must not silently read as cleared.
    assert.equal(displayFor({ allergens: [], allergens_reviewed: false }).state, 'ask')
  })

  test('a standard dish with no allergens is usable by someone filtering', () => {
    assert.equal(shouldHide(standardClean, ['fisk']), false)
  })

  test('an unknowable dish is hidden the moment anyone filters', () => {
    assert.equal(shouldHide(unknowable, ['fisk']), true)
    assert.equal(shouldHide(unknowable, ['lupin']), true)
  })

  test('a standard dish is hidden when it matches the filter', () => {
    assert.equal(shouldHide(standardFish, ['fisk']), true)
  })
})
