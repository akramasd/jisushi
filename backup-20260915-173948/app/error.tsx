"use client"
import { useEffect } from "react"
import { SITE } from "@/lib/site"

/**
 * Route-level error boundary.
 *
 * An error screen is not a mood — it is direction. It says what broke, what
 * still works, and gives the person the one thing that always works for a
 * restaurant: the phone number. No stack trace, no apology, no shrug.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[prepnest]", error)
  }, [error])

  return (
    <main className="min-h-screen bg-sumi text-white flex items-center justify-center px-6">
      <div className="max-w-md">
        <p className="ji-eyebrow text-white/70">Noget gik galt</p>
        <h1 className="ji-display text-[clamp(2rem,6vw,3rem)] mt-4">Siden kunne ikke vises</h1>
        <p className="ji-body text-[17px] leading-[1.85] text-white/75 mt-6">
          Prøv igen — det er som regel forbigående. Vil du bestille eller booke bord nu,
          så ring til os, så tager vi den over telefonen.
        </p>

        <div className="flex flex-wrap gap-3 mt-10">
          <button
            onClick={reset}
            className="ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold text-sumi px-6 py-4"
          >
            Prøv igen
          </button>
          <a
            href={SITE.phoneHref}
            className="ji-accent text-[13px] tracking-[0.2em] uppercase border border-white/30 px-6 py-4 hover:border-gold hover:text-gold transition-colors"
          >
            Ring {SITE.phoneDisplay}
          </a>
        </div>

        {error.digest && (
          <p className="ji-accent text-[12px] text-white/40 mt-8 tabular-nums">
            Fejlkode {error.digest}
          </p>
        )}
      </div>
    </main>
  )
}
