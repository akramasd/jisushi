import Link from "next/link"
import { SITE } from "@/lib/site"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-sumi text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="ji-eyebrow text-white/70">404</p>
        <h1 className="ji-display text-[clamp(2rem,6vw,3rem)] mt-4">Siden findes ikke</h1>
        <p className="ji-body text-[17px] leading-[1.85] text-white/75 mt-6">
          Linket er måske gammelt. Prøv menukortet, eller ring til os på{" "}
          <a href={SITE.phoneHref} className="text-gold ji-link">
            {SITE.phoneDisplay}
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-10">
          <Link
            href="/"
            className="ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold text-sumi px-6 py-4"
          >
            Til forsiden
          </Link>
          <Link
            href="/takeaway"
            className="ji-accent text-[13px] tracking-[0.2em] uppercase border border-white/30 px-6 py-4 hover:border-gold hover:text-gold transition-colors"
          >
            Bestil takeaway
          </Link>
        </div>
      </div>
    </main>
  )
}
