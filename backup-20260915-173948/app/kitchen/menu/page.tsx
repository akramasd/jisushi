"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { kr } from "@/lib/site"

type Item = {
  id: string
  name: string
  price: number | string
  category: string | null
  is_available: boolean
  sort_order: number | null
}
type Settings = { ordering_paused?: boolean; pause_message?: string | null; sms_enabled?: boolean }

/**
 * Owner controls.
 *
 * Everything here previously required the Supabase dashboard, which in practice
 * meant it happened once and then never again — so customers kept ordering
 * things the kitchen ran out of at six.
 *
 * Built for a phone held in one hand in a busy kitchen: large targets, one
 * column, and every change saved the moment it is made. No "save" button to
 * forget.
 */
export default function MenuAdmin() {
  const [items, setItems] = useState<Item[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [draftPrice, setDraftPrice] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/menu", { cache: "no-store" })
      if (res.status === 401) { window.location.href = "/kitchen/login"; return }
      const data = await res.json()
      if (!data.ok) { setError(data.error); return }
      setItems(data.items)
      setSettings(data.settings ?? {})
      setError(null)
    } catch {
      setError("Ingen forbindelse.")
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function patch(body: Record<string, unknown>, key: string) {
    setBusy(key)
    setError(null)
    try {
      const res = await fetch("/api/kitchen/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error); await load(); return false }
      return true
    } catch {
      setError("Kunne ikke gemme. Tjek forbindelsen.")
      return false
    } finally {
      setBusy(null)
    }
  }

  async function toggle(item: Item) {
    const next = !item.is_available
    // Optimistic: a kitchen tapping "udsolgt" mid-service should see it change now.
    setItems((l) => l.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)))
    const ok = await patch({ id: item.id, is_available: next }, item.id)
    if (!ok) setItems((l) => l.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)))
  }

  async function savePrice(item: Item) {
    const price = Number(draftPrice.replace(",", "."))
    if (!Number.isFinite(price) || price < 0) { setError("Ugyldig pris."); return }
    const ok = await patch({ id: item.id, price }, item.id)
    if (ok) {
      setItems((l) => l.map((i) => (i.id === item.id ? { ...i, price } : i)))
      setEditing(null)
    }
  }

  async function togglePause() {
    const next = !settings.ordering_paused
    setSettings((s) => ({ ...s, ordering_paused: next }))
    const ok = await patch(
      { setting: "ordering_paused", value: next, message: settings.pause_message ?? "" },
      "pause",
    )
    if (!ok) setSettings((s) => ({ ...s, ordering_paused: !next }))
  }

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter(
      (i) => i.name.toLowerCase().includes(needle) || (i.category ?? "").toLowerCase().includes(needle),
    )
  }, [items, q])

  const soldOut = items.filter((i) => !i.is_available)

  return (
    <div className="min-h-screen bg-sumi text-white px-5 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/kitchen" className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50">
          ← Køkken
        </Link>
        <h1 className="ji-display text-3xl mt-4">Menu og styring</h1>

        {error && (
          <p role="alert" className="ji-body text-[15px] border-l-2 border-gold pl-4 py-3 mt-6">{error}</p>
        )}

        {/* ── stop taking orders ── */}
        <div className={`border-2 p-5 mt-8 ${settings.ordering_paused ? "border-gold bg-gold/10" : "border-white/20"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ji-body text-[17px]">
                {settings.ordering_paused ? "Online bestilling er sat på pause" : "Vi tager imod bestillinger"}
              </p>
              <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                {settings.ordering_paused
                  ? "Kunder kan se menuen, men ikke bestille. De får telefonnummeret."
                  : "Sæt på pause ved travlhed, sygdom eller nedbrud i køkkenet."}
              </p>
            </div>
            <button
              onClick={togglePause}
              disabled={busy === "pause"}
              className={`shrink-0 ji-accent text-[12px] tracking-[0.16em] uppercase px-5 py-4 disabled:opacity-40 ${
                settings.ordering_paused ? "bg-gold text-sumi" : "border border-white/30 hover:border-gold"
              }`}
            >
              {settings.ordering_paused ? "Åbn igen" : "Sæt på pause"}
            </button>
          </div>

          {settings.ordering_paused && (
            <label className="block mt-5">
              <span className="ji-eyebrow text-white/60 block mb-2">Besked til kunden</span>
              <input
                value={settings.pause_message ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, pause_message: e.target.value }))}
                onBlur={() =>
                  patch(
                    { setting: "ordering_paused", value: true, message: settings.pause_message ?? "" },
                    "pause",
                  )
                }
                placeholder="Fx: Vi er helt fyldt op i aften — ring endelig."
                className="w-full bg-transparent border border-white/25 px-4 py-3 ji-body focus:border-gold outline-none"
              />
            </label>
          )}
        </div>

        {/* ── sold out summary ── */}
        {soldOut.length > 0 && (
          <div className="border border-white/20 p-5 mt-5">
            <p className="ji-eyebrow text-white/60 mb-3">Udsolgt lige nu · {soldOut.length}</p>
            <div className="flex flex-wrap gap-2">
              {soldOut.map((i) => (
                <button
                  key={i.id}
                  onClick={() => toggle(i)}
                  className="ji-body text-[14px] border border-gold text-gold px-3 py-2"
                >
                  {i.name} <span className="text-white/50 ml-1">sæt på igen</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── the menu ── */}
        <label className="block mt-8">
          <span className="sr-only">Søg i menuen</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg efter ret eller kategori"
            className="w-full bg-transparent border border-white/25 px-4 py-3 ji-body focus:border-gold outline-none"
          />
        </label>

        <p className="ji-body text-[13px] text-white/50 mt-3">
          Tryk på prisen for at rette den. Ændringer gemmes med det samme.
        </p>

        <ul className="mt-4">
          {shown.map((i) => (
            <li key={i.id} className="border-b border-white/10 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className={`ji-body text-[16px] truncate ${i.is_available ? "" : "text-white/40 line-through"}`}>
                  {i.name}
                </p>
                <p className="ji-body text-[13px] text-white/45">{i.category}</p>
              </div>

              {editing === i.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    autoFocus
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") savePrice(i)
                      if (e.key === "Escape") setEditing(null)
                    }}
                    inputMode="decimal"
                    className="w-20 bg-transparent border border-gold px-2 py-2 ji-display text-right tabular-nums outline-none"
                  />
                  <button onClick={() => savePrice(i)} className="ji-accent text-[11px] uppercase bg-gold text-sumi px-3 py-2">
                    Gem
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditing(i.id); setDraftPrice(String(i.price)) }}
                  className="ji-display text-lg tabular-nums text-white/85 hover:text-gold shrink-0 px-2"
                >
                  {kr(Number(i.price))}
                </button>
              )}

              <button
                onClick={() => toggle(i)}
                disabled={busy === i.id}
                aria-pressed={!i.is_available}
                className={`shrink-0 ji-accent text-[11px] tracking-[0.14em] uppercase px-3 py-3 border disabled:opacity-40 ${
                  i.is_available
                    ? "border-white/25 text-white/60 hover:border-gold"
                    : "border-gold text-gold"
                }`}
              >
                {i.is_available ? "Udsolgt" : "På menu"}
              </button>
            </li>
          ))}
        </ul>

        {shown.length === 0 && (
          <p className="ji-body text-white/60 text-center py-12">Ingen retter matcher.</p>
        )}
      </div>
    </div>
  )
}
