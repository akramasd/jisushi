"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const setup = params.get("setup") === "1"
  const next = params.get("next") || "/kitchen"

  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { input.current?.focus() }, [])

  async function submit() {
    if (pin.length < 4 || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/kitchen/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? "Forkert kode.")
        setPin("")
        input.current?.focus()
        return
      }
      router.replace(next)
      router.refresh()
    } catch {
      setError("Ingen forbindelse. Tjek nettet.")
    } finally {
      setBusy(false)
    }
  }

  if (setup) {
    return (
      <div className="max-w-sm w-full">
        <p className="ji-eyebrow text-white/70 mb-3">Ikke sat op</p>
        <h1 className="ji-display text-3xl mb-5">Køkkenskærmen mangler en kode</h1>
        <p className="ji-body text-[16px] leading-[1.8] text-white/75">
          Sæt <code className="ji-accent text-gold text-sm">STAFF_PIN</code> og{" "}
          <code className="ji-accent text-gold text-sm">STAFF_SESSION_SECRET</code> i
          miljøvariablerne, og deploy igen. Indtil da er skærmen lukket — ikke åben.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-xs w-full">
      <p className="ji-eyebrow text-white/70 mb-3">Kun for personale</p>
      <h1 className="ji-display text-3xl mb-8">Køkken</h1>

      <label className="block mb-5">
        <span className="ji-eyebrow text-white/70 block mb-2">Kode</span>
        <input
          ref={input}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          aria-describedby={error ? "pin-error" : undefined}
          className="w-full bg-transparent border border-white/25 px-4 py-4 ji-accent text-2xl tabular-nums tracking-[0.4em] text-center focus:border-gold outline-none"
        />
      </label>

      {error && (
        <p id="pin-error" role="alert" className="ji-body text-[15px] border-l-2 border-gold pl-4 py-2 mb-5 text-white/85">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={pin.length < 4 || busy}
        className="w-full ji-accent text-[13px] tracking-[0.22em] uppercase bg-gold text-sumi py-4 disabled:opacity-40 hover:bg-gold-lit transition-colors"
      >
        {busy ? "Et øjeblik…" : "Log ind"}
      </button>
    </div>
  )
}

export default function KitchenLogin() {
  return (
    <div className="min-h-screen bg-sumi text-white flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
