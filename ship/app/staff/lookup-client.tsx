"use client"

import { useState } from "react"
import { kr } from "@/lib/site"

type LookupOrder = {
  orderNo: number
  status: string
  items: { name: string; price: number; qty?: number; quantity?: number }[]
  total: number
  pickupMinutes: number | null
  createdAt: string
  readyEstimate: string | null
  acceptBy: string | null
  reason: string | null
}

const STATUS_DA: Record<string, string> = {
  pending_owner_confirmation: "Afventer bekræftelse",
  accepted: "Bekræftet",
  preparing: "Tilberedes",
  ready: "Klar til afhentning",
  completed: "Afhentet",
  cancelled: "Annulleret",
  rejected: "Afvist",
  confirmation_timeout: "Ikke bekræftet i tide",
  pending: "Modtaget",
}

export default function StaffLookup() {
  const [token, setToken] = useState("")
  const [order, setOrder] = useState<LookupOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const t = token.trim().toLowerCase()
    setError(null)
    setOrder(null)
    if (!/^[a-f0-9]{32}$/.test(t)) {
      setError("Indsæt det 32-tegns offentlige token fra ordrekvitteringen.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/order/${t}`, { cache: "no-store" })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? "Ordren blev ikke fundet.")
        return
      }
      setOrder(data.order as LookupOrder)
    } catch {
      setError("Kunne ikke hente ordren. Prøv igen.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Slå ordre op" className="border border-white/15 p-6 md:p-8">
      <h2 className="ji-display text-2xl">Slå ordre op</h2>
      <p className="ji-body text-[15px] text-white/65 mt-2 leading-[1.75]">
        Indsæt ordrens offentlige token (fra kvitteringens “Følg din
        bestilling”-link) og se live-status direkte fra databasen.
      </p>
      <form onSubmit={lookup} className="mt-6 flex flex-col sm:flex-row gap-3">
        <label className="sr-only" htmlFor="staff-token">
          Ordretoken
        </label>
        <input
          id="staff-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="fx 53b3fc789bfe4689a7d31a21ea1af7a7"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent border border-white/25 px-4 py-3 ji-accent tabular-nums text-[14px] outline-none focus:border-gold placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={busy}
          className="ji-accent text-[13px] tracking-[0.18em] uppercase bg-gold text-sumi px-6 py-3 disabled:opacity-50"
        >
          {busy ? "Henter…" : "Find ordre"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-5 border-l-2 border-gold pl-4 text-white/80 ji-body text-[15px]">
          {error}
        </p>
      )}

      {order && (
        <div className="mt-6 border border-gold/30 p-5 text-left">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <p className="ji-display text-xl">Ordre #{order.orderNo}</p>
            <p className="ji-accent text-[12px] uppercase tracking-[0.15em] text-gold">
              {STATUS_DA[order.status] ?? order.status}
            </p>
          </div>
          <ul className="mt-4 border-t border-white/10">
            {order.items.map((item, i) => {
              const qty = Number(item.quantity ?? item.qty ?? 1)
              return (
                <li key={i} className="flex justify-between gap-4 py-2 border-b border-white/10 ji-body text-[15px]">
                  <span>
                    <span className="tabular-nums text-gold">{qty}×</span> {item.name}
                  </span>
                  <span className="tabular-nums">{kr(Number(item.price) * qty)} kr</span>
                </li>
              )
            })}
          </ul>
          <div className="flex justify-between items-baseline mt-4">
            <span className="ji-eyebrow text-white/70">I alt</span>
            <span className="ji-display text-2xl tabular-nums">
              {kr(order.total)}<span className="text-sm text-white/70 ml-1">kr</span>
            </span>
          </div>
          {order.acceptBy && order.status === "pending_owner_confirmation" && (
            <p className="ji-body text-[14px] text-white/65 mt-3">
              Skal bekræftes senest{" "}
              {new Date(order.acceptBy).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </p>
          )}
        </div>
      )}
    </section>
  )
}
