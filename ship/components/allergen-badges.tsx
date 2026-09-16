"use client"
import { ALLERGENS, displayFor, SOY_SAUCE_NOTICE, type AllergenCode } from "@/lib/allergens"

/**
 * Allergen line under a dish.
 *
 * Three states, kept visually distinct on purpose:
 *   declared      — "Indeholder: Fisk, Sesam"
 *   none-declared — a positive statement, only after staff confirmed it
 *   ask           — not yet checked. Never rendered as an empty list, because
 *                   "we haven't checked" and "it contains nothing" must not
 *                   look the same to someone with an allergy.
 */
export function AllergenBadges({
  item,
  className = "",
}: {
  item: {
    allergens?: string[] | null
    allergens_reviewed?: boolean | null
    allergen_confidence?: string | null
    allergen_note?: string | null
  }
  className?: string
}) {
  const d = displayFor(item)

  // Not knowable from the menu — a chef's-choice box, or a dish with no
  // ingredient list. Give the phone number rather than a guess.
  if (d.state === "ask") {
    return (
      <p className={`ji-body text-[13px] text-white/60 ${className}`}>
        {item.allergen_note ?? "Ring til os om allergener i denne ret."}
      </p>
    )
  }

  const caveat =
    d.confidence === "standard" ? (
      <span className="block text-white/45 mt-1">
        Standardopskrift. Ring ved alvorlig allergi.
      </span>
    ) : null

  if (d.state === "none-declared") {
    return (
      <p className={`ji-body text-[13px] text-white/60 ${className}`}>
        Ingen af de 14 lovpligtige allergener.
        {item.allergen_note ? <span className="block mt-1">{item.allergen_note}</span> : null}
        {caveat}
      </p>
    )
  }

  return (
    <p className={`ji-body text-[13px] text-white/70 ${className}`}>
      <span className="ji-eyebrow text-white/50">Indeholder</span>{" "}
      {d.allergens.map((a, i) => (
        <span key={a}>
          {i > 0 && <span className="text-white/30"> · </span>}
          <span className="text-gold">{ALLERGENS[a as AllergenCode].da}</span>
        </span>
      ))}
      {item.allergen_note ? <span className="block text-white/55 mt-1">{item.allergen_note}</span> : null}
      {caveat}
    </p>
  )
}

/**
 * "Skjul retter med…" filter.
 *
 * Hides rather than merely marks: someone filtering out shellfish is scanning
 * for what they can eat, and a struck-through dish in the list is still a dish
 * they have to read carefully.
 */
export function AllergenFilter({
  avoid,
  onChange,
  counts,
}: {
  avoid: AllergenCode[]
  onChange: (next: AllergenCode[]) => void
  counts: Partial<Record<AllergenCode, number>>
}) {
  // Only offer allergens that actually occur on this menu.
  const present = (Object.keys(ALLERGENS) as AllergenCode[]).filter((a) => (counts[a] ?? 0) > 0)

  return (
    <details className="border border-white/15 mb-8">
      <summary className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/70 px-5 py-4 cursor-pointer list-none flex items-center justify-between">
        <span>Allergener{avoid.length > 0 && <span className="text-gold"> · {avoid.length} valgt</span>}</span>
        <span aria-hidden="true" className="text-white/40">+</span>
      </summary>

      <div className="px-5 pb-5">
        <p className="ji-body text-[14px] leading-[1.7] text-white/65 mb-4">
          Vælg det, du skal undgå. Retter, hvor vi endnu ikke har bekræftet
          allergenerne, skjules også — spørg os om dem.
        </p>

        <div className="flex flex-wrap gap-2">
          {present.map((a) => {
            const on = avoid.includes(a)
            return (
              <button
                key={a}
                onClick={() => onChange(on ? avoid.filter((x) => x !== a) : [...avoid, a])}
                aria-pressed={on}
                className={`ji-body text-[14px] px-4 py-3 border transition-colors ${
                  on ? "border-gold text-gold bg-gold/10" : "border-white/20 text-white/70 hover:border-white/40"
                }`}
              >
                {ALLERGENS[a].da}
                <span className="text-white/35 ml-2 tabular-nums text-[12px]">{counts[a]}</span>
              </button>
            )
          })}
        </div>

        {avoid.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50 hover:text-white/80 mt-4"
          >
            Ryd alle
          </button>
        )}

        <p className="ji-body text-[13px] leading-[1.7] text-white/60 mt-5 border-t border-white/10 pt-4">
          {SOY_SAUCE_NOTICE}
        </p>
        <p className="ji-body text-[13px] leading-[1.7] text-white/50 mt-3">
          Al mad tilberedes i det samme køkken, hvor der også håndteres fisk,
          skaldyr, sesam, soja og gluten. Vi kan derfor ikke garantere, at en ret
          er helt fri for spor. Har du en alvorlig allergi, så ring til os
          før bestilling.
        </p>
      </div>
    </details>
  )
}
