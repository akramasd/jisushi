"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { LockupHorizontal } from "@/components/brand/lockup"
import Seigaiha from "@/components/brand/seigaiha"
import FishMark from "@/components/fish-mark"
import { SITE } from "@/lib/site"

const MENUER = [
  { href: "/takeaway", label: "Bestil online", jp: "注文" },
  { href: "/menukort", label: "Menukort", jp: "お品書き" },
  { href: "/menu", label: "All You Can Eat", jp: "食べ放題" },
  { href: "/super-tilbud", label: "Super Tilbud", jp: "特別" },
  { href: "/vinmenu", label: "Vin Menu", jp: "飲物" },
]
const INFO = [
  { href: "/booking", label: "Bestil bord", jp: "予約" },
  { href: "/om-os", label: "Om os", jp: "物語" },
  { href: "/billeder", label: "Billeder", jp: "写真" },
  { href: "/jobs", label: "Jobs", jp: "求人" },
  { href: "/retningslinjer", label: "Retningslinjer", jp: "規則" },
  { href: "/kontakt", label: "Kontakt", jp: "連絡" },
]

export function AnimatedHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on navigation, or the panel stays open on top of the page you asked for.
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const isActive = (href: string) => pathname === href

  const item = (l: { href: string; label: string; jp: string }, i: number) => (
    <li key={l.href} className="border-b border-white/10">
      <Link
        href={l.href}
        aria-current={isActive(l.href) ? "page" : undefined}
        className={`group flex items-baseline gap-5 py-4 transition-colors ${
          isActive(l.href) ? "text-white" : "text-white/70 hover:text-white"
        }`}
      >
        <span className="ji-accent text-[11px] tabular-nums text-white/50 w-6 shrink-0">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="ji-display text-2xl sm:text-3xl flex-1">{l.label}</span>
        <span aria-hidden="true" className="ji-kanji text-xs text-white/60 group-hover:text-gold transition-colors">
          {l.jp}
        </span>
        {isActive(l.href) && <FishMark className="w-6 h-3 shrink-0 text-gold" strokeWidth={26} />}
      </Link>
    </li>
  )

  return (
    <header className="bg-sumi border-b border-gold/25 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between gap-4 text-white">
        <Link href="/" aria-label="Ji Sushi — forside" className="shrink-0 group">
          <LockupHorizontal markClass="w-12 h-6 transition-transform duration-500 group-hover:-translate-x-0.5" />
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/takeaway"
            className="hidden sm:inline-block ji-accent text-[12px] tracking-[0.2em] uppercase bg-gold text-sumi px-5 py-3 hover:bg-gold-lit transition-colors"
          >
            Bestil online
          </Link>
          <a
            href={SITE.phoneHref}
            className="hidden md:inline-block ji-accent text-[13px] tabular-nums text-white/80 hover:text-white transition-colors"
          >
            {SITE.phoneDisplay}
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="ji-index"
            aria-label={open ? "Luk menu" : "Åbn menu"}
            className="p-2 -mr-2 text-white hover:text-gold transition-colors"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Full-bleed index. Leaving the page should feel like a different room. */}
      <div
        id="ji-index"
        className={`fixed inset-0 top-[72px] z-40 bg-sumi text-white overflow-y-auto transition-[opacity,visibility] duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div aria-hidden="true" className="absolute inset-0 text-gold pointer-events-none">
          <Seigaiha ground="#0E0F11" opacity={0.1} size={72} />
        </div>

        <nav aria-label="Alle sider" className="relative max-w-6xl mx-auto px-6 py-10">
          <p className="ji-eyebrow text-gold mb-3">Menuer</p>
          <ul className="border-t border-white/10 mb-10">{MENUER.map(item)}</ul>

          <p className="ji-eyebrow text-gold mb-3">Information</p>
          <ul className="border-t border-white/10">{INFO.map(item)}</ul>

          <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="ji-eyebrow text-white/60 mb-2">Ring og bestil</p>
              <a href={SITE.phoneHref} className="ji-accent text-2xl tabular-nums text-white ji-link">
                {SITE.phoneDisplay}
              </a>
            </div>
            <address className="not-italic ji-body text-sm text-white/70 leading-relaxed">
              {SITE.street}<br />{SITE.city}
            </address>
          </div>
        </nav>
      </div>
    </header>
  )
}
