"use client"
import { useState } from "react"
import Link from "next/link"

type Check = { name: string; status: "pass" | "fail" | "warn"; detail: string }

/**
 * Systemtjek — designed for a phone held one-handed in a kitchen doorway.
 *
 * Big tap targets, one column, plain Danish, and a verdict at the top so the
 * answer to "is it working?" is visible without scrolling.
 */
export default function SelfTest() {
  const [checks, setChecks] = useState<Check[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/kitchen/selftest", { cache: "no-store" })
      if (res.status === 401) {
        setError("Din session er udløbet. Log ind igen.")
        return
      }
      const data = await res.json()
      data.ok ? setChecks(data.checks) : setError(data.error ?? "Tjekket fejlede.")
    } catch {
      setError("Ingen forbindelse. Prøv igen.")
    } finally {
      setBusy(false)
    }
  }

  const failed = checks?.filter((c) => c.status === "fail").length ?? 0
  const warned = checks?.filter((c) => c.status === "warn").length ?? 0

  return (
    <div className="min-h-screen bg-sumi text-white px-5 py-8">
      <div className="max-w-lg mx-auto">
        <Link href="/kitchen" className="ji-accent text-[12px] tracking-[0.16em] uppercase text-white/50">
          ← Køkken
        </Link>
        <h1 className="ji-display text-3xl mt-4">Systemtjek</h1>
        <p className="ji-body text-[16px] leading-[1.8] text-white/70 mt-3">
          Tjekker at bestillinger virker, at kundedata er beskyttet, og at
          dobbelte ordrer forhindres.
        </p>

        <button
          onClick={run}
          disabled={busy}
          className="w-full mt-8 ji-accent text-[13px] tracking-[0.22em] uppercase bg-gold text-sumi py-5 disabled:opacity-40"
        >
          {busy ? "Tjekker…" : checks ? "Kør igen" : "Kør tjek"}
        </button>

        {error && (
          <p role="alert" className="ji-body text-[15px] border-l-2 border-gold pl-4 py-3 mt-6 text-white/85">
            {error}
          </p>
        )}

        {checks && (
          <>
            <div
              className={`mt-8 border-2 px-5 py-5 ${failed ? "border-gold bg-gold/10" : "border-white/20"}`}
              role="status"
            >
              <p className="ji-display text-2xl">
                {failed === 0 ? "Alt virker" : `${failed} problem${failed > 1 ? "er" : ""}`}
              </p>
              <p className="ji-body text-[15px] text-white/75 mt-2 leading-[1.7]">
                {failed === 0
                  ? warned === 0
                    ? "Systemet er klar til at tage imod bestillinger."
                    : `Klar til bestillinger. ${warned} ting kan forbedres — se nedenfor.`
                  : "Ret det markerede nedenfor, før I tager imod bestillinger."}
              </p>
            </div>

            <ul className="mt-6">
              {checks.map((c, i) => (
                <li key={i} className="border-b border-white/10 py-4 flex gap-4">
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-2 h-2 mt-2 rounded-full ${
                      c.status === "pass" ? "bg-gold" : c.status === "warn" ? "bg-white/40" : "bg-gold"
                    } ${c.status === "fail" ? "ring-4 ring-gold/30" : ""}`}
                  />
                  <div>
                    <p className="ji-body text-[17px]">
                      {c.name}
                      <span className="sr-only">
                        {c.status === "pass" ? " — i orden" : c.status === "warn" ? " — advarsel" : " — fejl"}
                      </span>
                    </p>
                    <p
                      className={`ji-body text-[15px] leading-[1.7] mt-1 ${
                        c.status === "fail" ? "text-gold" : "text-white/65"
                      }`}
                    >
                      {c.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="ji-body text-[14px] text-white/50 mt-8 leading-[1.7]">
              Står der, at schema.sql skal køres igen: åbn Supabase i browseren,
              gå til SQL Editor, indsæt hele schema.sql og tryk Run. Kør så dette
              tjek igen.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
