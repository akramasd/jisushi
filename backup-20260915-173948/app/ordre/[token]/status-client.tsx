"use client"
import { useCallback, useEffect, useState } from "react"
import { kr, SITE } from "@/lib/site"
import { CUSTOMER_COPY, type OrderStatus } from "@/lib/order-status"
import FishMark from "@/components/fish-mark"

type Order = {
  orderNo: number
  status: OrderStatus
  items: { name: string; qty: number; price: number }[]
  total: number
  pickupMinutes: number | null
  createdAt: string
  readyEstimate: string | null
  cancelReason: string | null
}

/** The four states a customer moves through, drawn as a rail. */
const RAIL: OrderStatus[] = ["pending", "accepted", "ready", "completed"]

export default function StatusClient({ token }: { token: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${token}`, { cache: "no-store" })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? "Ukendt ordre.")
        return
      }
      setOrder(data.order)
      setError(null)
      setStale(false)
    } catch {
      // Keep showing the last known status rather than blanking the screen —
      // someone checking this in a car park has intermittent signal by default.
      setStale(true)
    }
  }, [token])

  useEffect(() => {
    load()
    const poll = setInterval(load, 15000)
    // A phone screen locks. Re-check the moment it comes back rather than
    // waiting out the remainder of the interval.
    const onVisible = () => document.visibilityState === "visible" && load()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(poll)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  if (error) {
    return (
      <section className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="ji-display text-3xl">Vi kan ikke finde den bestilling</h1>
        <p className="ji-body text-[17px] text-white/75 mt-6 leading-[1.85]">
          Linket er måske forkert eller mere end 30 dage gammelt. Ring til os på{" "}
          <a href={SITE.phoneHref} className="text-gold ji-link">{SITE.phoneDisplay}</a>, så finder vi den.
        </p>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="ji-body text-white/60">Henter din bestilling…</p>
      </section>
    )
  }

  const copy = CUSTOMER_COPY[order.status]
  const cancelled = order.status === "cancelled"
  const stepIndex = RAIL.indexOf(order.status)

  const eta = order.readyEstimate
    ? new Date(order.readyEstimate).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <section className="max-w-xl mx-auto px-6 py-16">
      <div className="text-center">
        <p className="ji-eyebrow text-white/70">Ordre #{order.orderNo}</p>
        <h1 className="ji-display text-[clamp(2rem,6vw,3rem)] mt-4">{copy.title}</h1>
        <p className="ji-body text-[17px] text-white/75 mt-5 leading-[1.85]">
          {cancelled && order.cancelReason ? order.cancelReason : copy.body}
        </p>

        {order.status === "ready" && (
          <FishMark draw className="w-24 h-12 mx-auto text-gold mt-8" strokeWidth={18} />
        )}

        {eta && !cancelled && order.status !== "completed" && (
          <p className="ji-display text-2xl mt-8 tabular-nums">
            Klar ca. kl. {eta}
          </p>
        )}
      </div>

      {!cancelled && (
        <ol className="flex items-center gap-2 mt-12" aria-label="Status">
          {RAIL.map((s, i) => (
            <li key={s} className="flex-1">
              <div
                className={`h-1 ${i <= stepIndex ? "bg-gold" : "bg-white/15"}`}
                aria-hidden="true"
              />
              <span
                className={`ji-accent text-[11px] tracking-[0.12em] uppercase mt-2 block ${
                  i <= stepIndex ? "text-gold" : "text-white/40"
                }`}
              >
                {["Sendt", "Bekræftet", "Klar", "Afhentet"][i]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <ul className="border-t border-white/15 mt-12">
        {order.items?.map((it, k) => (
          <li key={k} className="flex justify-between gap-4 py-3 border-b border-white/10">
            <span className="ji-body">
              <span className="tabular-nums text-gold">{it.qty}×</span> {it.name}
            </span>
            <span className="ji-display tabular-nums">{kr(it.price * it.qty)} kr</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-baseline mt-6">
        <span className="ji-eyebrow text-white/70">I alt</span>
        <span className="ji-display text-2xl tabular-nums">
          {kr(order.total)}<span className="text-sm text-white/70 ml-1">kr</span>
        </span>
      </div>

      <p className="ji-body text-[15px] text-white/70 mt-10 leading-[1.8] text-center">
        Betales ved afhentning på {SITE.street}, {SITE.city}.{" "}
        <a href={SITE.phoneHref} className="text-gold ji-link">Ring {SITE.phoneDisplay}</a>
      </p>

      {stale && (
        <p role="status" className="ji-body text-[14px] text-white/55 mt-6 text-center">
          Ingen forbindelse lige nu — viser sidst kendte status.
        </p>
      )}
    </section>
  )
}
