export const V3_STATUSES = [
  "pending",
  "pending_owner_confirmation",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "rejected",
  "confirmation_timeout",
] as const

export type V3OrderStatus = (typeof V3_STATUSES)[number]

export const V3_CUSTOMER_COPY: Record<
  V3OrderStatus,
  { title: string; body: string }
> = {
  pending: {
    title: "Bestilling modtaget",
    body: "Din bestilling er modtaget og afventer behandling.",
  },
  pending_owner_confirmation: {
    title: "Afventer Ji Sushi",
    body: "Din bestilling er modtaget. Restauranten har op til 10 minutter til at bekræfte den.",
  },
  accepted: {
    title: "Bestillingen er bekræftet",
    body: "Ji Sushi har bekræftet din bestilling.",
  },
  preparing: {
    title: "Køkkenet er i gang",
    body: "Din bestilling bliver tilberedt nu.",
  },
  ready: {
    title: "Klar til afhentning",
    body: "Din bestilling står klar til afhentning.",
  },
  completed: {
    title: "Afhentet",
    body: "Tak fordi du bestilte hos Ji Sushi.",
  },
  cancelled: {
    title: "Bestillingen er annulleret",
    body: "Ring til Ji Sushi, hvis du har spørgsmål til bestillingen.",
  },
  rejected: {
    title: "Bestillingen kunne ikke bekræftes",
    body: "Ji Sushi kunne desværre ikke bekræfte bestillingen.",
  },
  confirmation_timeout: {
    title: "Ikke bekræftet endnu",
    body: "Ji Sushi nåede ikke at bekræfte bestillingen inden for 10 minutter. Bestillingen er ikke automatisk annulleret — ring venligst til restauranten.",
  },
}

export const V3_RAIL: V3OrderStatus[] = [
  "pending_owner_confirmation",
  "accepted",
  "preparing",
  "ready",
  "completed",
]
