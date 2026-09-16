"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ALLERGENS, type AllergenCode } from "@/lib/allergens"

type Item = {
  id: string
  name: string
  description: string | null
  category: string | null
  allergens: string[] | null
  allergens_reviewed: boolean | null
  allergen_note: string | null
}

/**
 * Allergen review — the gate between a guess and a legal declaration.
 *
 * Every dish arrives here pre-filled with what the ingredient text suggests.
 * Staff confirm or correct, one dish at a time. Nothing reaches a customer as
 * "confirmed" until someone here presses Bekræft.
 */
export default function AllergenReview() {
  const [items, setItems] = useState<Item[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/allergens", { cache: "no-store" })
      if (res.status === 401) { window.location.href = "/kitchen/login"; return }
      const data = await res.json()
      data.ok ? setItems(data.items) : setError(data.error)
    } catch {
      setError("Ingen forbindelse.")
    }
  }, [])

  useEffect(() => { load() }, [load])

  const shown = useMemo(
    () => (onlyUnreviewed ? items.filter((i) => !i.allergens_reviewed) : items),
    [items, onlyUnreviewed],
  )
  const done = items.filter((i) => i.allergens_reviewed).length

  function toggle(id: string, code: AllergenCode) {
    setItems((list) =>
      list.map((i) => {
        if (i.id !== id) return i
        const cur = (i.allergens ?? []) as string[]
        return { ...i, allergens: cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code] }
      }),
    )
  }

  async function confirm(item: Item) {
    setSaving(item.id)
    setError(null)
    try {
      const res = await fetch("/api/kitchen/allergens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, allergens: item.allergens ?? [], note: item.allergen_note }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error); return }
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, allergens_reviewed: true } : i)))
    } catch {
      setError("Kunne ikke gemme. Tjek forbindelsen.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-sumi text-white px-5 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/kitchen" className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50">
          ← Køkken
        </Link>
        <h1 className="ji-display text-3xl mt-4">Allergener</h1>

        <p className="ji-body text-[16px] leading-[1.8] text-white/70 mt-4">
          Forslagene nedenfor er læst ud af ingredienslisterne. De er
          <strong className="text-white"> ikke</strong> gyldige, før I bekræfter dem.
          Indtil da står der “spørg os” på hjemmesiden.
        </p>
        <p className="ji-body text-[15px] leading-[1.8] text-white/60 mt-3">
          Tjek især saucer, marinader og friturefedt — det er dem, der oftest
          bærer soja, gluten og sesam uden at stå i navnet.
        </p>

        <div className="flex items-center justify-between gap-4 mt-8 mb-6 border-y border-white/15 py-4">
          <span className="ji-accent text-sm text-white/70 tabular-nums">
            {done} af {items.length} bekræftet
          </span>
          <button
            onClick={() => setOnlyUnreviewed((v) => !v)}
            className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/60 hover:text-white"
          >
            {onlyUnreviewed ? "Vis alle" : "Vis kun ubekræftede"}
          </button>
        </div>

        {error && (
          <p role="alert" className="ji-body text-[15px] border-l-2 border-gold pl-4 py-3 mb-6">{error}</p>
        )}

        {shown.length === 0 && (
          <p className="ji-body text-white/70 text-center py-16">
            Alle retter er bekræftet. Godt gået.
          </p>
        )}

        <ul>
          {shown.map((item) => {
            const selected = (item.allergens ?? []) as string[]
            return (
              <li key={item.id} className="border-b border-white/10 py-6">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="ji-body text-[17px]">{item.name}</p>
                  {item.allergens_reviewed && (
                    <span className="ji-accent text-[11px] tracking-[0.16em] uppercase text-gold shrink-0">
                      Bekræftet
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">{item.description}</p>
                )}
                {item.allergen_note && (
                  <p className="ji-body text-[14px] text-gold mt-2">{item.allergen_note}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {(Object.keys(ALLERGENS) as AllergenCode[]).map((code) => {
                    const on = selected.includes(code)
                    return (
                      <button
                        key={code}
                        onClick={() => toggle(item.id, code)}
                        aria-pressed={on}
                        title={ALLERGENS[code].note}
                        className={`ji-body text-[14px] px-3 py-2 border transition-colors ${
                          on ? "border-gold text-gold bg-gold/10" : "border-white/15 text-white/45 hover:border-white/35"
                        }`}
                      >
                        {ALLERGENS[code].da}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => confirm(item)}
                  disabled={saving === item.id}
                  className="mt-4 ji-accent text-[12px] tracking-[0.18em] uppercase bg-gold text-sumi px-6 py-3 disabled:opacity-40"
                >
                  {saving === item.id ? "Gemmer…" : item.allergens_reviewed ? "Gem ændring" : "Bekræft"}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
