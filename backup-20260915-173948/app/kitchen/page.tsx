"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { kr } from "@/lib/site"
import { KITCHEN_NEXT, STATUS_LABEL, type OrderStatus } from "@/lib/order-status"
import { useWakeLock } from "@/lib/use-wake-lock"

type Order = {
  id: string
  order_no: number
  customer_name: string
  customer_phone: string
  items: { name: string; qty: number; price: number }[]
  total_price: number
  pickup_minutes: number | null
  created_at: string
  status: OrderStatus
  ready_estimate: string | null
  cancel_reason: string | null
}

const since = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })

/**
 * A short chime, synthesised rather than shipped as a file — no asset to host,
 * no 404 in the one moment it matters. A kitchen does not watch the screen.
 */
function useChime() {
  const ctx = useRef<AudioContext | null>(null)
  return useCallback(() => {
    try {
      ctx.current ??= new (window.AudioContext || (window as any).webkitAudioContext)()
      const ac = ctx.current
      if (ac.state === "suspended") void ac.resume()
      const now = ac.currentTime
      for (const [i, freq] of [880, 1320].entries()) {
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.type = "sine"
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, now + i * 0.16)
        gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.16 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.35)
        osc.connect(gain).connect(ac.destination)
        osc.start(now + i * 0.16)
        osc.stop(now + i * 0.16 + 0.4)
      }
    } catch {
      /* Audio blocked until first interaction. The visual alert still fires. */
    }
  }, [])
}

export default function KitchenPage() {
  const router = useRouter()
  const [view, setView] = useState<"active" | "history">("active")
  const [orders, setOrders] = useState<Order[]>([])
  const [q, setQ] = useState("")
  const [, setTick] = useState(0)
  const [offline, setOffline] = useState(false)
  const [ready, setReady] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [printing, setPrinting] = useState<string | null>(null)
  const [degraded, setDegraded] = useState<{ since: string; count: number } | null>(null)

  // Watch for orders that bypassed the database. If any arrived, the kitchen
  // must be told where to look — a screen that simply shows nothing is
  // indistinguishable from a quiet evening, which is the dangerous case.
  useEffect(() => {
    let stop = false
    const check = async () => {
      try {
        const res = await fetch("/api/kitchen/degraded", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!stop) setDegraded(data.active ? { since: data.since, count: data.count } : null)
      } catch {
        /* The offline banner already covers connection problems. */
      }
    }
    check()
    const t = setInterval(check, 60000)
    return () => { stop = true; clearInterval(t) }
  }, [])

  // Printing is synchronous and blocking, so the flag has to be set, painted,
  // and only then handed to the browser — otherwise the ticket prints empty.
  useEffect(() => {
    if (!printing) return
    const t = setTimeout(() => {
      window.print()
      setPrinting(null)
    }, 60)
    return () => clearTimeout(t)
  }, [printing])

  const seen = useRef<Set<string>>(new Set())
  const first = useRef(true)
  const chime = useChime()

  // Only while working the pass — no reason to hold the screen on for history.
  useWakeLock(view === "active")

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const params = new URLSearchParams({ view })
        if (view === "history" && q.trim()) params.set("q", q.trim())
        const res = await fetch(`/api/kitchen/orders?${params}`, { cache: "no-store" })
        if (res.status === 401) {
          router.replace("/kitchen/login")
          return
        }
        const data = await res.json()
        if (!data.ok) throw new Error()

        const next = (data.orders ?? []) as Order[]

        if (view === "active") {
          // Announce only orders new to this session, never on first load —
          // otherwise every refresh sounds like a dinner rush.
          const fresh = next.filter((o) => o.status === "pending" && !seen.current.has(o.id))
          if (!first.current && fresh.length > 0 && !opts?.silent) chime()
          for (const o of next) seen.current.add(o.id)
          if (seen.current.size > 2000) {
            // Bounded: a 12-hour service on one open tab should not grow forever.
            seen.current = new Set([...seen.current].slice(-1000))
          }
          first.current = false
        }

        setOrders(next)
        setOffline(false)
        setReady(true)
      } catch {
        // Silence looks identical to "no orders" — the most dangerous confusion
        // in a kitchen, so failure has to be loud.
        setOffline(true)
        setReady(true)
      }
    },
    [chime, router, view, q],
  )

  useEffect(() => {
    load()
    const poll = setInterval(load, view === "active" ? 10000 : 60000)
    const ticker = setInterval(() => setTick((t) => t + 1), 30000)
    // An iPad that has been asleep has missed every poll. Catch up the instant
    // it wakes rather than waiting out the interval.
    const onVisible = () => document.visibilityState === "visible" && load({ silent: false })
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", () => load())
    return () => {
      clearInterval(poll)
      clearInterval(ticker)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load, view])

  const listCount = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length
  const [bgCount, setBgCount] = useState(0)

  // While the history tab is open, keep watching the pass in the background.
  // Otherwise looking up last Tuesday's order means nobody is watching tonight's.
  useEffect(() => {
    if (view !== "history") return
    let stop = false
    const check = async () => {
      try {
        const res = await fetch("/api/kitchen/orders?view=active", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (stop || !data.ok) return
        const list = (data.orders ?? []) as Order[]
        const fresh = list.filter((o) => o.status === "pending" && !seen.current.has(o.id))
        if (fresh.length > 0) chime()
        for (const o of list) seen.current.add(o.id)
        setBgCount(list.length)
      } catch {
        /* The active tab surfaces connection problems; don't double-alarm. */
      }
    }
    check()
    const t = setInterval(check, 10000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [view, chime])

  const activeCount = view === "active" ? listCount : bgCount

  useEffect(() => {
    document.title = activeCount ? `(${activeCount}) Køkken` : "Køkken"
  }, [activeCount])

  async function move(o: Order, status: OrderStatus, extra?: { etaMinutes?: number; reason?: string }) {
    // Optimistic: the pass cannot wait on a round trip.
    setOrders((list) =>
      view === "active" && (status === "completed" || status === "cancelled")
        ? list.filter((x) => x.id !== o.id)
        : list.map((x) => (x.id === o.id ? { ...x, status } : x)),
    )
    try {
      const res = await fetch("/api/kitchen/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: o.id, status, ...extra }),
      })
      if (!res.ok) await load({ silent: true }) // server refused — resync to truth
    } catch {
      setOffline(true)
    }
    load({ silent: true })
  }

  return (
    <div className="min-h-screen bg-sumi text-white p-5">
      <header className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-baseline gap-4">
          <h1 className="ji-display text-2xl">Køkken</h1>
          {view === "active" && (
            <span className="ji-accent text-sm text-white/70 tabular-nums">{activeCount} aktive</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSoundOn((s) => !s)
              chime() // also unlocks audio: browsers require a user gesture first
            }}
            aria-pressed={soundOn}
            className={`ji-accent text-[12px] tracking-[0.16em] uppercase px-4 py-2 border transition-colors ${
              soundOn ? "border-gold text-gold" : "border-white/25 text-white/60"
            }`}
          >
            {soundOn ? "Lyd til" : "Lyd fra"}
          </button>
          <a
            href="/kitchen/menu"
            className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50 hover:text-white/80"
          >
            Menu
          </a>
          <a
            href="/kitchen/allergener"
            className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50 hover:text-white/80"
          >
            Allergener
          </a>
          <a
            href="/kitchen/selftest"
            className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50 hover:text-white/80"
          >
            Systemtjek
          </a>
          <button
            onClick={async () => {
              await fetch("/api/kitchen/login", { method: "DELETE" })
              router.replace("/kitchen/login")
            }}
            className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50 hover:text-white/80"
          >
            Log ud
          </button>
        </div>
      </header>

      <div className="flex gap-2 mb-5" role="tablist">
        {(["active", "history"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => {
              setView(v)
              setOrders([])
              setReady(false)
            }}
            className={`ji-accent text-[12px] tracking-[0.16em] uppercase px-5 py-3 border transition-colors ${
              view === v ? "border-gold text-gold" : "border-white/20 text-white/60"
            }`}
          >
            {v === "active" ? "På pas" : "Historik · 30 dage"}
            {v === "active" && view === "history" && bgCount > 0 && (
              <span className="ml-2 tabular-nums text-gold">({bgCount})</span>
            )}
          </button>
        ))}
      </div>

      {view === "history" && (
        <div className="mb-5">
          <label className="block max-w-md">
            <span className="sr-only">Søg i historik</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Ordrenummer, navn eller telefon"
              className="w-full bg-transparent border border-white/25 px-4 py-3 ji-body focus:border-gold outline-none"
            />
          </label>
          <p className="ji-body text-[13px] text-white/50 mt-2">
            Ordrer slettes automatisk efter 30 dage.
          </p>
        </div>
      )}

      {degraded && (
        <div role="alert" className="mb-6 border-2 border-gold bg-gold/15 px-5 py-5">
          <p className="ji-display text-xl mb-2">Systemet kører i nødspor</p>
          <p className="ji-body text-[16px] leading-[1.8] text-white/85">
            {degraded.count === 1
              ? "1 ordre er kommet ind uden at nå databasen"
              : `${degraded.count} ordrer er kommet ind uden at nå databasen`}{" "}
            siden {degraded.since}. <strong className="text-white">De står ikke på denne skærm.</strong>
          </p>
          <ol className="ji-body text-[16px] leading-[1.9] text-white/85 mt-3 list-decimal pl-5">
            <li>Åbn ordre-regnearket, fanen <strong className="text-white">Køkken</strong></li>
            <li>Lav de ordrer, der står med rødt</li>
            <li>Skriv “Afhentet” i statuskolonnen, når de er hentet</li>
            <li>Ring til {" "}
              <a href="tel:+4531334486" className="text-gold underline">31 33 44 86</a>{" "}
              kunden, hvis noget er uklart
            </li>
          </ol>
          <p className="ji-body text-[15px] text-white/65 mt-3">
            Denne besked forsvinder af sig selv, når systemet kører normalt igen.
          </p>
        </div>
      )}

      {offline && (
        <div role="alert" className="mb-6 border-2 border-gold bg-gold/10 px-5 py-4">
          <p className="ji-accent text-sm font-medium">
            Forbindelse afbrudt — der kan komme ordrer, som ikke vises. Tjek nettet.
          </p>
        </div>
      )}

      {ready && orders.length === 0 && !offline && (
        <p className="ji-body text-white/70 mt-20 text-center text-lg">
          {view === "active" ? "Ingen ordrer lige nu." : "Ingen ordrer fundet."}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => {
          const mins = since(o.created_at)
          const late = o.status !== "completed" && (o.pickup_minutes ? mins > o.pickup_minutes : mins > 30)
          const next = KITCHEN_NEXT[o.status]
          return (
            <li
              key={o.id}
              data-print-ticket={printing === o.id ? "" : undefined}
              className={`border-2 p-5 ${
                o.status === "cancelled"
                  ? "border-white/10 opacity-60"
                  : late && view === "active"
                    ? "border-gold"
                    : "border-white/20"
              }`}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="ji-display text-3xl tabular-nums">#{o.order_no}</span>
                <span className={`ji-accent text-sm tabular-nums ${late && view === "active" ? "text-gold" : "text-white/70"}`}>
                  {view === "active" ? `${mins} min` : clock(o.created_at)}
                </span>
              </div>
              <p className="ji-accent text-[11px] tracking-[0.16em] uppercase text-white/50 mb-3">
                {STATUS_LABEL[o.status]}
                {o.ready_estimate && o.status === "accepted" && ` · klar ${clock(o.ready_estimate)}`}
              </p>

              <p className="ji-body text-lg">{o.customer_name}</p>
              <a href={`tel:${o.customer_phone}`} className="ji-accent text-sm text-white/70 tabular-nums">
                {o.customer_phone}
              </a>
              {o.pickup_minutes ? (
                <p className="ji-accent text-sm text-white/70 mt-1">Ønsket afhentning: {o.pickup_minutes} min</p>
              ) : null}

              <ul className="my-4 border-t border-white/15 pt-3">
                {o.items?.map((it, k) => (
                  <li key={k} className="flex justify-between py-1.5 ji-body">
                    <span>
                      <span className="tabular-nums text-gold">{it.qty}×</span> {it.name}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="ji-display text-xl tabular-nums">{kr(Number(o.total_price))} kr</span>

                {view === "active" && next && (
                  <div className="flex gap-2" data-print-hide>
                    <button
                      onClick={() => setPrinting(o.id)}
                      aria-label={`Udskriv seddel til ordre ${o.order_no}`}
                      className="ji-accent text-[12px] tracking-[0.16em] uppercase border border-white/25 text-white/60 px-4 py-4 hover:border-white/50"
                    >
                      Seddel
                    </button>
                    {o.status === "pending" && (
                      <button
                        onClick={() => move(o, "cancelled")}
                        className="ji-accent text-[12px] tracking-[0.16em] uppercase border border-white/25 text-white/60 px-4 py-4 hover:border-white/50"
                      >
                        Afvis
                      </button>
                    )}
                    <button
                      onClick={() =>
                        move(o, next.to, next.to === "accepted" ? { etaMinutes: o.pickup_minutes ?? 30 } : undefined)
                      }
                      className="ji-accent text-[13px] tracking-[0.18em] uppercase bg-gold text-sumi px-6 py-4 hover:bg-gold-lit transition-colors"
                    >
                      {next.label}
                    </button>
                  </div>
                )}

                {view === "history" && o.status === "completed" && (
                  <button
                    onClick={() => move(o, "ready")}
                    className="ji-accent text-[12px] tracking-[0.16em] uppercase border border-gold text-gold px-4 py-3"
                  >
                    Fortryd
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
