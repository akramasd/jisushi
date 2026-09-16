/**
 * The order lifecycle, in one place.
 *
 * The customer and the kitchen read the same states from the same module, so
 * the status shown on a phone 15 minutes away cannot drift from the status on
 * the pass.
 */

export const STATUSES = ['pending', 'accepted', 'ready', 'completed', 'cancelled'] as const
export type OrderStatus = (typeof STATUSES)[number]

/** Which transitions are legal. Anything else is rejected server-side, so a
 *  stale kitchen tab cannot un-cancel an order or skip acceptance. */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['ready', 'cancelled'],
  // 'cancelled' is here for the no-show: food goes on the shelf, the customer
  // never arrives, and without this the order sits on the pass forever with no
  // way to close it out. A real kitchen needs to void that.
  ready: ['completed', 'accepted', 'cancelled'],
  completed: ['ready'], // the undo path, and only that
  cancelled: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false
}

/** What the customer sees. Written to answer "is my food happening?" */
export const CUSTOMER_COPY: Record<OrderStatus, { title: string; body: string }> = {
  pending: {
    title: 'Sendt til køkkenet',
    body: 'Vi har modtaget din bestilling. Køkkenet bekræfter om et øjeblik.',
  },
  accepted: {
    title: 'Køkkenet er i gang',
    body: 'Din bestilling er bekræftet og bliver lavet nu.',
  },
  ready: {
    title: 'Klar til afhentning',
    body: 'Din bestilling står klar. Vi ses i Lodsgade 10.',
  },
  completed: {
    title: 'Afhentet',
    body: 'Tak fordi du bestilte hos os.',
  },
  cancelled: {
    title: 'Annulleret',
    body: 'Din bestilling blev desværre annulleret. Ring til os, hvis det er en fejl.',
  },
}

/** What the kitchen sees on the button that advances the order. */
export const KITCHEN_NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: 'accepted', label: 'Bekræft' },
  accepted: { to: 'ready', label: 'Klar' },
  ready: { to: 'completed', label: 'Afhentet' },
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Ny',
  accepted: 'I gang',
  ready: 'Klar',
  completed: 'Afhentet',
  cancelled: 'Annulleret',
}
