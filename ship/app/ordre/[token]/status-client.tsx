"use client"

import { useCallback, useEffect, useState } from "react"
import { kr, SITE } from "@/lib/site"
import {
  V3_CUSTOMER_COPY,
  V3_RAIL,
  type V3OrderStatus,
} from "@/lib/order-status-v3"
import FishMark from "@/components/fish-mark"

type OrderItem = {
  name: string
  price: number
  qty?: number
  quantity?: number
}

type Order = {
  orderNo: number
  status: V3OrderStatus
  items: OrderItem[]
  total: number
  pickupMinutes: number | null
  createdAt: string
  readyEstimate: string | null
  acceptBy: string | null
  reason: string | null
}

const LABELS = [
  "Modtaget",
  "Bekræftet",
  "Tilberedes",
  "Klar",
  "Afhentet",
]

export default function StatusClient({ token }: { token: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [, tick] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${token}`, {
        cache: "no-store",
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error ?? "Ukendt ordre.")
        return
      }

      setOrder(data.order)
      setError(null)
      setStale(false)
    } catch {
      setStale(true)
    }
  }, [token])

  useEffect(() => {
    load()

    const poll = setInterval(load, 10_000)
    const clock = setInterval(() => tick((n) => n + 1), 1_000)

    const onVisible = () => {
      if (document.visibilityState === "visible") load()
    }

    document.addEventListener("visibilitychange", onVisible)

    return () => {
      clearInterval(poll)
      clearInterval(clock)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  if (error) {
    return (
      <section className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="ji-display text-3xl">
          Vi kan ikke finde den bestilling
        </h1>

        <p className="ji-body text-[17px] text-white/75 mt-6 leading-[1.85]">
          Ring til os på{" "}
          <a href={SITE.phoneHref} className="text-gold ji-link">
            {SITE.phoneDisplay}
          </a>
          , så hjælper vi dig.
        </p>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="ji-body text-white/60">
          Henter din bestilling…
        </p>
      </section>
    )
  }

  const copy =
    V3_CUSTOMER_COPY[order.status] ??
    V3_CUSTOMER_COPY.pending_owner_confirmation

  const failed = [
    "cancelled",
    "rejected",
    "confirmation_timeout",
  ].includes(order.status)

  const railStatus =
    order.status === "pending"
      ? "pending_owner_confirmation"
      : order.status

  const stepIndex = V3_RAIL.indexOf(
    railStatus as V3OrderStatus,
  )

  const eta = order.readyEstimate
    ? new Date(order.readyEstimate).toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const remainingMs =
    order.status === "pending_owner_confirmation" && order.acceptBy
      ? new Date(order.acceptBy).getTime() - Date.now()
      : null

  const remainingSeconds =
    remainingMs == null
      ? null
      : Math.max(0, Math.ceil(remainingMs / 1000))

  const remaining =
    remainingSeconds == null
      ? null
      : `${Math.floor(remainingSeconds / 60)}:${String(
          remainingSeconds % 60,
        ).padStart(2, "0")}`

  return (
    <section className="max-w-xl mx-auto px-6 py-16">
      <div className="text-center">
        <p className="ji-eyebrow text-white/70">
          Ordre #{order.orderNo}
        </p>

        <h1 className="ji-display text-[clamp(2rem,6vw,3rem)] mt-4">
          {copy.title}
        </h1>

        <p className="ji-body text-[17px] text-white/75 mt-5 leading-[1.85]">
          {failed && order.reason ? order.reason : copy.body}
        </p>

        {remaining !== null && (
          <div className="mt-8 border border-gold/30 px-5 py-4">
            <p className="ji-eyebrow text-white/60">
              Tid tilbage til bekræftelse
            </p>

            <p className="ji-display text-3xl text-gold tabular-nums mt-2">
              {remaining}
            </p>
          </div>
        )}

        {order.status === "ready" && (
          <FishMark
            draw
            className="w-24 h-12 mx-auto text-gold mt-8"
            strokeWidth={18}
          />
        )}

        {eta &&
          !failed &&
          order.status !== "completed" &&
          order.status !== "ready" && (
            <p className="ji-display text-2xl mt-8 tabular-nums">
              Klar ca. kl. {eta}
            </p>
          )}

        {order.status === "ready" && (
          <p className="ji-display text-2xl mt-8 text-gold">
            Din mad er klar nu
          </p>
        )}
      </div>

      {!failed && (
        <ol
          className="flex items-start gap-2 mt-12"
          aria-label="Status"
        >
          {V3_RAIL.map((status, i) => (
            <li key={status} className="flex-1">
              <div
                className={`h-1 ${
                  i <= stepIndex ? "bg-gold" : "bg-white/15"
                }`}
              />

              <span
                className={`ji-accent text-[10px] tracking-[0.08em] uppercase mt-2 block ${
                  i <= stepIndex
                    ? "text-gold"
                    : "text-white/40"
                }`}
              >
                {LABELS[i]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <ul className="border-t border-white/15 mt-12">
        {(order.items ?? []).map((item, index) => {
          const qty = Number(item.quantity ?? item.qty ?? 1)

          return (
            <li
              key={index}
              className="flex justify-between gap-4 py-3 border-b border-white/10"
            >
              <span className="ji-body">
                <span className="tabular-nums text-gold">
                  {qty}×
                </span>{" "}
                {item.name}
              </span>

              <span className="ji-display tabular-nums">
                {kr(Number(item.price) * qty)} kr
              </span>
            </li>
          )
        })}
      </ul>

      <div className="flex justify-between items-baseline mt-6">
        <span className="ji-eyebrow text-white/70">
          I alt
        </span>

        <span className="ji-display text-2xl tabular-nums">
          {kr(order.total)}
          <span className="text-sm text-white/70 ml-1">
            kr
          </span>
        </span>
      </div>

      <p className="ji-body text-[15px] text-white/70 mt-10 leading-[1.8] text-center">
        Betales ved afhentning på {SITE.street}, {SITE.city}.{" "}
        <a href={SITE.phoneHref} className="text-gold ji-link">
          Ring {SITE.phoneDisplay}
        </a>
      </p>

      {stale && (
        <p
          role="status"
          className="ji-body text-[14px] text-white/55 mt-6 text-center"
        >
          Ingen forbindelse lige nu — viser sidst kendte status.
        </p>
      )}
    </section>
  )
}
