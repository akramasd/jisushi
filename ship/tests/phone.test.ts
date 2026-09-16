import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { normalisePhone, isValidDanishMobile, formatDanishPhone } from '../lib/phone.ts'

/**
 * This suite exists because the bug it describes actually shipped: phone
 * lookup in the 30-day history returned nothing for most customers, because
 * "31 33 44 86" was stored verbatim and searched for as "31334486".
 */
describe('every way a customer writes the same number', () => {
  const SAME = [
    '31334486', '31 33 44 86', '3133 4486', '31-33-44-86',
    '+45 31334486', '+4531334486', '0045 31334486', ' 31334486 ',
    '(+45) 31 33 44 86',
  ]

  test('all normalise to one value', () => {
    const results = new Set(SAME.map(normalisePhone))
    assert.equal(results.size, 1, `got ${[...results].join(' | ')}`)
    assert.equal([...results][0], '31334486')
  })

  test('all are accepted as valid', () => {
    for (const s of SAME) assert.equal(isValidDanishMobile(s), true, `rejected: ${s}`)
  })

  test('all would match the same history search', () => {
    const stored = SAME.map(normalisePhone)
    const typedByStaff = normalisePhone('3133 4486')
    for (const s of stored) assert.ok(s.includes(typedByStaff), 'search would miss this order')
  })
})

describe('rejects what is not a Danish mobile', () => {
  for (const bad of ['', '1234567', '123456789', 'abcdefgh', '00000000', '12345678', '+44 7700 900123']) {
    test(`rejects ${JSON.stringify(bad)}`, () => assert.equal(isValidDanishMobile(bad), false))
  }
})

describe('display', () => {
  test('formats the way it is written on a receipt', () => {
    assert.equal(formatDanishPhone('+4531334486'), '31 33 44 86')
  })
  test('leaves an unrecognised value alone rather than mangling it', () => {
    assert.equal(formatDanishPhone('ring til Ali'), 'ring til Ali')
  })
})
