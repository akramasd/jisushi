/**
 * The 14 allergens EU law requires a food business to declare.
 *
 * Regulation (EU) No 1169/2011, Annex II. For food sold at a distance — which
 * is what a takeaway website is — the information must be available to the
 * customer BEFORE they buy, not on the bag when they collect it.
 *
 * ── The safety rule this module is built around ──
 *
 * Nothing here is a substitute for the kitchen's own knowledge. `deriveAllergens`
 * reads ingredient text and produces a SUGGESTION for staff to review. Until a
 * human confirms it, an item is treated as UNDECLARED — and undeclared is
 * shown to customers as "ask us", never as "contains nothing".
 *
 * The asymmetry is deliberate. Over-declaring costs a sale. Under-declaring
 * can put someone in hospital.
 */

export const ALLERGENS = {
  gluten:     { da: 'Gluten',        note: 'hvede, byg, rug, havre' },
  krebsdyr:   { da: 'Krebsdyr',      note: 'rejer, krebs, krabbe' },
  aeg:        { da: 'Æg',            note: '' },
  fisk:       { da: 'Fisk',          note: '' },
  jordnoedder:{ da: 'Jordnødder',    note: '' },
  soja:       { da: 'Soja',          note: '' },
  maelk:      { da: 'Mælk',          note: 'inkl. laktose' },
  noedder:    { da: 'Nødder',        note: 'mandler, cashew, valnødder m.fl.' },
  selleri:    { da: 'Selleri',       note: '' },
  sennep:     { da: 'Sennep',        note: '' },
  sesam:      { da: 'Sesam',         note: '' },
  sulfitter:  { da: 'Svovldioxid og sulfitter', note: '' },
  lupin:      { da: 'Lupin',         note: '' },
  bloeddyr:   { da: 'Bløddyr',       note: 'blæksprutte, muslinger' },
} as const

export type AllergenCode = keyof typeof ALLERGENS
export const ALLERGEN_CODES = Object.keys(ALLERGENS) as AllergenCode[]

export function isAllergenCode(v: string): v is AllergenCode {
  return (ALLERGEN_CODES as string[]).includes(v)
}

export function allergenLabel(code: AllergenCode): string {
  return ALLERGENS[code].da
}

/**
 * Ingredient words → allergens.
 *
 * Ordered from most specific to least so that "tempura rejer" matches both the
 * batter and the shellfish. Matching is on word boundaries against lowercased,
 * accent-preserved Danish text.
 *
 * Where an ingredient is *usually* but not always a carrier — soy sauce almost
 * always contains wheat; wasabi paste commonly contains mustard — it is
 * declared. A restaurant that uses a gluten-free tamari can remove it during
 * review. That direction of error is the safe one.
 */
const RULES: { match: RegExp; allergens: AllergenCode[]; because: string }[] = [
  // ── fish ──
  { match: /\b(laks|tun|hvidfisk|fisk|sashimi|makrel|ål|torsk)\b/i, allergens: ['fisk'], because: 'fisk' },
  { match: /\b(tobiko|ørredrogn|rogn|masago|gunkan)\b/i, allergens: ['fisk'], because: 'rogn' },
  { match: /\blaksemousse\b/i, allergens: ['fisk', 'maelk'], because: 'laksemousse' },
  // Surimi is white fish bound with wheat starch and often egg white.
  { match: /\b(surimi|crabstick)\b/i, allergens: ['fisk', 'gluten', 'aeg'], because: 'surimi' },
  { match: /\b(dashi|bonito|katsuo)\b/i, allergens: ['fisk'], because: 'dashi' },

  // ── shellfish / molluscs ──
  { match: /\b(rejer?|reje|tigerreje\w*|ebi|krebsehaler|krebs|krabbe|rejechips)\b/i,
    allergens: ['krebsdyr'], because: 'skaldyr' },
  { match: /\b(blæksprutte|muslinger|østers|kammusling)\b/i, allergens: ['bloeddyr'], because: 'bløddyr' },

  // ── cereals ──
  { match: /\b(tempura|panko|forårsrulle\w*|gyoza|dumpling|nudler|udon|ramen|brød|mel)\b/i,
    allergens: ['gluten'], because: 'frituredej/melprodukt' },
  { match: /\btempura\b/i, allergens: ['aeg'], because: 'tempuradej' },

  // ── soy: soy sauce nearly always contains wheat ──
  { match: /\b(soja\w*|sojasauce|teriyaki|ponzu|miso|edamame|tofu|inari)\b/i,
    allergens: ['soja'], because: 'soja' },
  { match: /\b(sojasauce|teriyaki|ponzu|miso)\b/i, allergens: ['gluten'], because: 'sojasauce indeholder hvede' },
  { match: /\bponzu\b/i, allergens: ['fisk'], because: 'ponzu med bonito' },

  // ── egg / dairy ──
  { match: /\b(mayo|mayonnaise|aioli|tamago|æg)\b/i, allergens: ['aeg'], because: 'mayonnaise/æg' },
  { match: /\b(flødeost|fløde|ost|smør|mælk|philadelphia)\b/i, allergens: ['maelk'], because: 'mejeri' },

  // ── seeds / condiments ──
  { match: /\b(sesam\w*|goma|tahin)\b/i, allergens: ['sesam'], because: 'sesam' },
  { match: /\bgoma\b/i, allergens: ['soja'], because: 'goma dressing' },
  // Danish "wasabi" is normally horseradish + mustard, not true wasabi.
  { match: /\b(wasabi|sennep)\b/i, allergens: ['sennep'], because: 'wasabi/peberrod indeholder ofte sennep' },
  { match: /\b(jordnødd\w*|peanut\w*)\b/i, allergens: ['jordnoedder'], because: 'jordnødder' },
  { match: /\b(mandl\w*|cashew|valnødd\w*|pistacie\w*|nødd\w*)\b/i, allergens: ['noedder'], because: 'nødder' },
  { match: /\bselleri\b/i, allergens: ['selleri'], because: 'selleri' },
  { match: /\b(vin|eddike|tørret frugt)\b/i, allergens: ['sulfitter'], because: 'sulfitter' },

  // ── prepared items ──
  { match: /\bkimchi\b/i, allergens: ['fisk'], because: 'kimchi laves oftest med fiskesauce' },
  { match: /\b(tangsalat|wakame)\b/i, allergens: ['sesam', 'soja'], because: 'tangsalat er typisk sesam/soja-marineret' },
]

export type Derivation = { allergens: AllergenCode[]; reasons: string[] }

/**
 * Suggests allergens from a dish's name and description.
 *
 * Returns a suggestion only. The caller must not present this to a customer as
 * confirmed — see the safety rule at the top of this file.
 */
export function deriveAllergens(name: string, description?: string | null): Derivation {
  const text = `${name ?? ''} ${description ?? ''}`.toLowerCase()
  const found = new Set<AllergenCode>()
  const reasons = new Set<string>()

  for (const rule of RULES) {
    if (!rule.match.test(text)) continue
    for (const a of rule.allergens) found.add(a)
    reasons.add(rule.because)
  }

  // Sushi rice is seasoned with rice vinegar; nori is plain. Neither is
  // declarable, so an item with no matches genuinely may have none — but that
  // is still a suggestion, not a clearance.
  return {
    allergens: ALLERGEN_CODES.filter((c) => found.has(c)),
    reasons: [...reasons],
  }
}

/**
 * How much the declaration can be trusted.
 *
 *   confirmed — a human in the kitchen checked this dish
 *   standard  — derived from the dish type. Sashimi is fish, tempura is wheat
 *               batter, ebi is prawn. True of the standard recipe, and stated
 *               with that caveat attached.
 *   uncertain — cannot be known from the menu. Chef's-choice boxes, dishes with
 *               no ingredient list. These say "ring til os" and nothing else.
 *
 * The middle tier exists because the alternative was worse. Marking all 101
 * dishes "ask us" is technically safe and practically useless: a customer who
 * must phone about every dish will order somewhere else, and a warning that
 * appears everywhere stops being read. Basic accurate information, plainly
 * labelled as a standard recipe, is what other takeaway sites give and what
 * people can actually act on.
 */
export type AllergenConfidence = 'confirmed' | 'standard' | 'uncertain'

export type AllergenDisplay =
  | { state: 'declared'; allergens: AllergenCode[]; confidence: AllergenConfidence }
  | { state: 'none-declared'; confidence: AllergenConfidence }
  | { state: 'ask' }

type ItemLike = {
  allergens?: string[] | null
  allergens_reviewed?: boolean | null
  allergen_confidence?: string | null
  allergen_note?: string | null
}

function confidenceOf(item: ItemLike): AllergenConfidence {
  if (item.allergens_reviewed) return 'confirmed'
  const c = item.allergen_confidence
  return c === 'standard' || c === 'uncertain' ? c : 'uncertain'
}

export function displayFor(item: ItemLike): AllergenDisplay {
  const confidence = confidenceOf(item)

  // Nothing derivable about this dish. Do not guess, and do not imply safety.
  if (confidence === 'uncertain') return { state: 'ask' }

  const codes = (item.allergens ?? []).filter(isAllergenCode)
  return codes.length
    ? { state: 'declared', allergens: codes, confidence }
    : { state: 'none-declared', confidence }
}

/**
 * Should this item be hidden when a customer is avoiding `avoid`?
 *
 * An item nobody can characterise is hidden too. If someone has filtered out
 * shellfish, showing them a chef's-choice box is the failure this exists to
 * prevent — the fact that it *might* be fine is not good enough.
 */
export function shouldHide(item: ItemLike, avoid: AllergenCode[]): boolean {
  if (avoid.length === 0) return false
  const d = displayFor(item)
  if (d.state === 'ask') return true
  if (d.state === 'none-declared') return false
  return d.allergens.some((a) => avoid.includes(a))
}

/**
 * Served alongside almost everything in a sushi restaurant, so it belongs in one
 * standing notice rather than on all 101 dishes.
 */
export const SOY_SAUCE_NOTICE =
  'Sojasauce serveres til og indeholder soja og gluten. Sig til, hvis du ikke vil have den med.'
