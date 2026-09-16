import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { canTransition, STATUSES, KITCHEN_NEXT, CUSTOMER_COPY, STATUS_LABEL, type OrderStatus } from '../lib/order-status.ts'

describe('the order lifecycle', () => {
  test('the happy path is walkable end to end', () => {
    const path: OrderStatus[] = ['pending', 'accepted', 'ready', 'completed']
    for (let i = 0; i < path.length - 1; i++) {
      assert.equal(canTransition(path[i], path[i + 1]), true, `${path[i]} -> ${path[i + 1]}`)
    }
  })

  test('a cancelled order is final', () => {
    for (const s of STATUSES) {
      assert.equal(canTransition('cancelled', s), false, `cancelled -> ${s} must be refused`)
    }
  })

  test('acceptance cannot be skipped', () => {
    // A stale tab must not mark an unconfirmed order as collected.
    assert.equal(canTransition('pending', 'ready'), false)
    assert.equal(canTransition('pending', 'completed'), false)
  })

  test('a collected order cannot be cancelled after the fact', () => {
    assert.equal(canTransition('completed', 'cancelled'), false)
  })

  test('a no-show can be voided from ready', () => {
    // Food on the shelf, customer never arrives. Without this the order sits on
    // the pass forever with no way to close it out.
    assert.equal(canTransition('ready', 'cancelled'), true)
  })

  test('undo exists, and goes exactly one step back', () => {
    assert.equal(canTransition('completed', 'ready'), true)
    assert.equal(canTransition('completed', 'accepted'), false)
  })

  test('no transition loops back to itself', () => {
    for (const s of STATUSES) assert.equal(canTransition(s, s), false)
  })

  test('an unknown status is refused rather than defaulting to allowed', () => {
    assert.equal(canTransition('nonsense' as OrderStatus, 'ready'), false)
    assert.equal(canTransition('pending', 'nonsense' as OrderStatus), false)
  })
})

describe('every state is presentable', () => {
  test('the customer is told something for each state', () => {
    for (const s of STATUSES) {
      assert.ok(CUSTOMER_COPY[s]?.title, `no title for ${s}`)
      assert.ok(CUSTOMER_COPY[s]?.body, `no body for ${s}`)
      assert.ok(STATUS_LABEL[s], `no kitchen label for ${s}`)
    }
  })

  test('every kitchen button leads somewhere legal', () => {
    for (const [from, next] of Object.entries(KITCHEN_NEXT)) {
      assert.equal(canTransition(from as OrderStatus, next!.to), true,
        `button "${next!.label}" offers an illegal move`)
    }
  })

  test('terminal states offer no button', () => {
    assert.equal(KITCHEN_NEXT.completed, undefined)
    assert.equal(KITCHEN_NEXT.cancelled, undefined)
  })
})
