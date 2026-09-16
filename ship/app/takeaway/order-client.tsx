"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import type { MenuItem } from "@/lib/supabase"
import type { OpenState } from "@/lib/opening-hours"
import { kr, SITE } from "@/lib/site"
import FishMark from "@/components/fish-mark"
import { useFocusTrap, useScrollLock } from "@/lib/use-focus-trap"
import { postJson, newIdempotencyKey, networkMessage } from "@/lib/net"
import { AllergenBadges, AllergenFilter } from "@/components/allergen-badges"
import { shouldHide, type AllergenCode } from "@/lib/allergens"
import Link from "next/link"

/** Keyed by menu_items.id, which is a UUID string — never a number. */
type Cart = Record<string, number>

export default function OrderClient({
  items,
  categories,
  openState,
  paused = { on: false, message: null },
}: {
  items: MenuItem[]
  categories: string[]
  openState: OpenState
  paused?: { on: boolean; message: string | null }
}) {
  const [cart, setCart] = useState<Cart>({})
  const [sheet, setSheet] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [pickup, setPickup] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ orderNo: number | string; total: number; token: string | null; degraded?: boolean } | null>(null)
  const [retrying, setRetrying] = useState(0)
  const [avoid, setAvoid] = useState<AllergenCode[]>([])

  // One key per checkout attempt, held across retries so the server can tell a
  // retry from a genuinely new order. Regenerated only after a success.
  const idemKey = useRef<string>(newIdempotencyKey())

  // A manual pause behaves exactly like being shut: the cart bar hides, the
  // submit button disables, and the reason shown is the owner's own wording.
  const closed = paused.on || !openState.open || openState.lastOrderPassed
  const closedReason = paused.on
    ? paused.message ||
      "Vi tager ikke imod online bestillinger lige nu. Ring endelig til os."
    : null

  const sheetRef = useFocusTrap<HTMLDivElement>(sheet)
  const restored = useRef(false)

  // A phone rings, a bus arrives, the tab is reloaded — a cart that empties on
  // refresh is a customer who does not start over.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ji-cart")
      if (saved) setCart(JSON.parse(saved))
      const savedName = localStorage.getItem("ji-name")
      const savedPhone = localStorage.getItem("ji-phone")
      if (savedName) setName(savedName)
      if (savedPhone) setPhone(savedPhone)
    } catch {
      /* Private mode, or corrupt value. An empty cart is a fine fallback. */
    }
    restored.current = true
  }, [])

  useEffect(() => {
    if (!restored.current) return
    try {
      localStorage.setItem("ji-cart", JSON.stringify(cart))
    } catch {}
  }, [cart])

  useScrollLock(sheet)

  // Escape closes the sheet; the overlay covers the page, so it must be
  // dismissible without hunting for the "Luk" control.
  useEffect(() => {
    if (!sheet) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sheet])


  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ item: items.find((i) => i.id === id)!, qty }))
        .filter((l) => l.item && l.qty > 0),
    [cart, items],
  )

  // A cart restored from a previous visit can name items the kitchen has since
  // removed. Dropping them silently means the customer checks out with a
  // shorter order than they placed and only finds out at the counter.
  const droppedCount = useMemo(
    () => Object.keys(cart).filter((id) => !items.some((i) => i.id === id)).length,
    [cart, items],
  )

  useEffect(() => {
    if (droppedCount === 0) return
    setCart((c) => {
      const copy: Cart = {}
      for (const [id, qty] of Object.entries(c)) if (items.some((i) => i.id === id)) copy[id] = qty
      return copy
    })
    setError(
      droppedCount === 1
        ? "En vare fra din tidligere kurv er ikke på menuen længere og er fjernet."
        : `${droppedCount} varer fra din tidligere kurv er ikke på menuen længere og er fjernet.`,
    )
  }, [droppedCount, items])
  const total = lines.reduce((s, l) => s + Number(l.item.price) * l.qty, 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)

  // Only offer a filter for allergens that actually occur on this menu — a
  // list of fourteen where twelve match nothing is noise.
  const allergenCounts = useMemo(() => {
    const c: Partial<Record<AllergenCode, number>> = {}
    for (const i of items) {
      for (const a of (i.allergens ?? []) as AllergenCode[]) c[a] = (c[a] ?? 0) + 1
    }
    return c
  }, [items])

  // Drives the empty state: filtered everything out, here is the phone number.
  const visibleCount = useMemo(
    () => items.filter((i) => !shouldHide(i, avoid)).length,
    [items, avoid],
  )

  // Validate before the round trip. The server re-checks — it is the authority —
  // but telling someone their number is short after a spinner is worse.
  const phoneDigits = phone.replace(/\D/g, "").replace(/^45/, "")
  const nameOk = name.trim().length >= 2
  const phoneOk = phoneDigits.length === 8
  const canSubmit = nameOk && phoneOk && lines.length > 0 && !busy && !closed

  const add = (id: string, d: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + d)
      const copy = { ...c }
      if (next === 0) delete copy[id]
      else copy[id] = next
      return copy
    })

  async function submit() {
    setBusy(true)
    setError(null)
    setRetrying(0)
    try {
      const data = await postJson<{
        ok: boolean
        error?: string
        orderNo: number | string
        total: number
        token: string | null
        degraded?: boolean
      }>(
        "/api/checkout",
        {
          items: lines.map((l) => ({ id: l.item.id, qty: l.qty })),
          name,
          phone,
          pickupMinutes: pickup,
          idempotencyKey: idemKey.current,
        },
        { onRetry: (n) => setRetrying(n) },
      )

      if (!data.ok) {
        setError(data.error ?? "Noget gik galt.")
        return
      }

      setDone({ orderNo: data.orderNo, total: data.total, token: data.token, degraded: data.degraded })
      setCart({})
      // Only now is the attempt over — a fresh key for any next order.
      idemKey.current = newIdempotencyKey()
      try {
        localStorage.removeItem("ji-cart")
        localStorage.setItem("ji-name", name.trim())
        localStorage.setItem("ji-phone", phone.trim())
        // Survives a closed tab, so the receipt is findable from the car.
        if (data.token) localStorage.setItem("ji-last-order", data.token)
      } catch {}
    } catch (e) {
      setError(networkMessage(e))
    } finally {
      setBusy(false)
      setRetrying(0)
    }
  }

  if (done) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <FishMark draw className="w-28 h-14 mx-auto text-gold mb-10" strokeWidth={18} />
        <p className="ji-eyebrow text-white/70">Tak for din bestilling</p>
        <h2 className="ji-display text-[clamp(2rem,6vw,3.2rem)] mt-4">Ordre #{done.orderNo}</h2>
        <p className="ji-body text-[18px] text-white/75 mt-6 max-w-md mx-auto leading-[1.85]">
          Du betaler {kr(done.total)} kr ved afhentning på {SITE.street}. Er der noget, ringer vi til dig.
        </p>

        {done.token ? (
          <>
            <Link
              href={`/ordre/${done.token}`}
              className="inline-block mt-10 ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold text-sumi px-8 py-4"
            >
              Følg din bestilling
            </Link>
            <p className="ji-body text-[14px] text-white/60 mt-4 max-w-sm mx-auto leading-[1.7]">
              Gem linket. Der kan du se, når køkkenet har bekræftet, og når maden er klar.
            </p>
          </>
        ) : (
          // Degraded: the order reached the kitchen, but not the database, so
          // there is no status page to send them to. Say that, rather than
          // linking to a page that would 404.
          <div className="mt-10 border-l-2 border-gold pl-5 py-3 max-w-md mx-auto text-left">
            <p className="ji-body text-[15px] leading-[1.8] text-white/80">
              Vi har modtaget din bestilling, men vores system er delvist nede
              lige nu, så du kan ikke følge den online. Ring gerne på{" "}
              <a href={SITE.phoneHref} className="text-gold ji-link">{SITE.phoneDisplay}</a>{" "}
              og få den bekræftet.
            </p>
          </div>
        )}
      </section>
    )
  }

  return (
    <>
      {closed && (
        <div role="status" className="bg-slate-ink border-b border-white/10 px-6 py-4 text-center">
          <p className="ji-eyebrow text-white/70 mb-1">
            {closedReason
              ? "Bestilling er sat på pause"
              : openState.open
                ? "Køkkenet lukker snart"
                : "Vi har lukket lige nu"}
          </p>
          <p className="ji-body text-sm text-white/75">
            {/* The owner's own wording wins. They know why they paused, and a
                generic "we are closed" during opening hours reads as a fault. */}
            {closedReason ??
              (openState.open
                ? `Vi tager ikke flere online bestillinger i aften (vi lukker kl. ${openState.closesAt}).`
                : `Du kan se menukortet, men bestilling åbner igen kl. ${openState.opensAt}.`)}{" "}
            <a href={SITE.phoneHref} className="text-gold ji-link">Ring {SITE.phoneDisplay}</a>
          </p>
        </div>
      )}

      {error && !sheet && (
        <div role="alert" className="bg-slate-ink border-b border-gold/40 px-6 py-4">
          <p className="ji-body text-[15px] text-white/85 max-w-6xl mx-auto">{error}</p>
        </div>
      )}

      {/* Category rail */}
      <nav aria-label="Kategorier" className="sticky top-[72px] z-30 bg-sumi/95 backdrop-blur border-b border-white/10">
        <ul className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto py-4">
          {categories.map((c) => (
            <li key={c}>
              <a
                href={`#kat-${c.replace(/\s+/g, "-")}`}
                className="ji-accent text-[12px] tracking-[0.16em] uppercase whitespace-nowrap text-white/70 hover:text-gold transition-colors"
              >
                {c}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pb-40">
        <AllergenFilter avoid={avoid} onChange={setAvoid} counts={allergenCounts} />

        {avoid.length > 0 && visibleCount === 0 && (
          <p role="status" className="ji-body text-[16px] leading-[1.8] text-white/70 border-l-2 border-gold pl-5 py-4">
            Ingen retter matcher. Ring til os på{" "}
            <a href={SITE.phoneHref} className="text-gold ji-link">{SITE.phoneDisplay}</a> —
            vi kender køkkenet og kan sige, hvad der kan lade sig gøre.
          </p>
        )}

        {categories.map((cat) => {
          const inCat = items.filter((i) => i.category === cat && !shouldHide(i, avoid))
          // A heading over nothing reads as a bug, so drop the whole section.
          if (inCat.length === 0) return null
          return (
          <section key={cat} id={`kat-${cat.replace(/\s+/g, "-")}`} className="pt-14 scroll-mt-[9rem]">
            <h2 className="ji-display text-[clamp(1.5rem,3.5vw,2.2rem)] pb-4 border-b border-white/15">
              {cat}
            </h2>
            <ul>
              {inCat
                .map((i) => {
                  const qty = cart[i.id] ?? 0
                  return (
                    <li key={i.id} className="flex items-start gap-5 py-5 border-b border-white/10">
                      <div className="flex-1 min-w-0">
                        <p className="ji-body text-[17px]">{i.name}</p>
                        {i.description && (
                          <p className="ji-body text-[14px] leading-[1.7] text-white/70 mt-1">
                            {i.description}
                          </p>
                        )}
                        <AllergenBadges item={i} className="mt-2" />
                        {!i.is_available && (
                          <p className="ji-eyebrow text-white/70 mt-2">Udsolgt</p>
                        )}
                      </div>
                      <p className="ji-display text-[19px] tabular-nums shrink-0">
                        {kr(Number(i.price))}<span className="text-xs text-white/70 ml-1">kr</span>
                      </p>
                      {i.is_available && !closed && (
                        <div className="flex items-center gap-3 shrink-0">
                          {qty > 0 && (
                            <>
                              <button
                                onClick={() => add(i.id, -1)}
                                aria-label={`Fjern én ${i.name}`}
                                className="w-11 h-11 border border-white/30 text-white hover:border-gold hover:text-gold transition-colors"
                              >
                                −
                              </button>
                              <span className="ji-accent tabular-nums w-5 text-center">{qty}</span>
                            </>
                          )}
                          <button
                            onClick={() => add(i.id, 1)}
                            aria-label={`Tilføj ${i.name}`}
                            className="w-11 h-11 border border-white/30 text-white hover:border-gold hover:text-gold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          </section>
          )
        })}
      </div>

      {/* Cart bar */}
      {count > 0 && !sheet && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-ink border-t border-gold/30" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <button
            onClick={() => setSheet(true)}
            className="max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between gap-4"
          >
            <span className="ji-accent text-[13px] tracking-[0.16em] uppercase text-white/80">
              {count} {count === 1 ? "vare" : "varer"}
            </span>
            <span className="ji-display text-xl tabular-nums">
              {kr(total)}<span className="text-xs text-white/70 ml-1">kr</span>
            </span>
            <span className="ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold text-sumi px-6 py-3">
              Gå til bestilling
            </span>
          </button>
        </div>
      )}

      {sheet && (
        <div
          ref={sheetRef}
          className="fixed inset-0 z-50 bg-sumi/95 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Din bestilling"
        >
          <div className="max-w-lg mx-auto px-6 py-12">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="ji-display text-2xl">Din bestilling</h2>
              <button onClick={() => setSheet(false)} className="ji-accent text-[12px] tracking-[0.2em] uppercase text-white/70 hover:text-white">
                Luk
              </button>
            </div>

            <ul className="border-t border-white/15 mb-8">
              {lines.map((l) => (
                <li key={l.item.id} className="flex items-center gap-4 py-4 border-b border-white/10">
                  <span className="ji-body flex-1">{l.item.name}</span>
                  <button onClick={() => add(l.item.id, -1)} aria-label="Færre" className="w-10 h-10 border border-white/30 hover:border-gold hover:text-gold">−</button>
                  <span className="ji-accent tabular-nums w-5 text-center">{l.qty}</span>
                  <button onClick={() => add(l.item.id, 1)} aria-label="Flere" className="w-10 h-10 border border-white/30 hover:border-gold hover:text-gold">+</button>
                  <span className="ji-display tabular-nums w-20 text-right">{kr(Number(l.item.price) * l.qty)} kr</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-baseline mb-10">
              <span className="ji-eyebrow text-white/70">I alt</span>
              <span className="ji-display text-3xl tabular-nums">{kr(total)}<span className="text-sm text-white/70 ml-1">kr</span></span>
            </div>

            <label className="block mb-5">
              <span className="ji-eyebrow text-white/70 block mb-2">Navn</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                aria-invalid={name.length > 0 && !nameOk}
                className="w-full bg-transparent border border-white/25 px-4 py-3 ji-body focus:border-gold outline-none"
              />
            </label>
            <label className="block mb-5">
              <span className="ji-eyebrow text-white/70 block mb-2">Telefon</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                required
                aria-invalid={phone.length > 0 && !phoneOk}
                aria-describedby="tlf-hint"
                className="w-full bg-transparent border border-white/25 px-4 py-3 ji-accent tabular-nums focus:border-gold outline-none"
              />
              <span
                id="tlf-hint"
                className={`ji-body text-[13px] mt-2 block ${
                  phone.length > 0 && !phoneOk ? "text-gold" : "text-white/55"
                }`}
              >
                {phone.length > 0 && !phoneOk
                  ? "Et dansk mobilnummer er 8 cifre."
                  : "Vi ringer kun, hvis der er noget med din ordre."}
              </span>
            </label>

            <fieldset className="mb-8">
              <legend className="ji-eyebrow text-white/70 mb-3">Afhentning om</legend>
              <div className="flex flex-wrap gap-2">
                {[15, 30, 45, 60].map((m) => (
                  <button key={m} onClick={() => setPickup(m)}
                    className={`ji-accent text-[13px] px-5 py-3 border transition-colors ${
                      pickup === m ? "border-gold text-gold" : "border-white/25 text-white/70 hover:border-white/50"
                    }`}>
                    {m} min
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="ji-body text-[15px] border-l-2 border-gold pl-4 py-2 mb-6 text-white/85">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full ji-accent text-[13px] tracking-[0.22em] uppercase bg-gold text-sumi py-5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-lit transition-colors"
            >
              {busy ? (retrying > 0 ? `Prøver igen (${retrying})…` : "Sender…") : "Send bestilling"}
            </button>
            <p className="ji-body text-[13px] text-white/70 text-center mt-4">
              Du betaler ved afhentning — kontant eller kort i butikken.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
