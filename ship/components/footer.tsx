import Link from "next/link"
import { LockupVertical } from "@/components/brand/lockup"
import Seigaiha from "@/components/brand/seigaiha"
import WaveDivider from "@/components/brand/wave-divider"
import { COMPANY, SITE } from "@/lib/site"

const SIDER = [
  { href: "/takeaway", label: "Bestil online" },
  { href: "/menukort", label: "Menukort" },
  { href: "/menu", label: "All You Can Eat" },
  { href: "/super-tilbud", label: "Super Tilbud" },
  { href: "/vinmenu", label: "Vin Menu" },
  { href: "/booking", label: "Bestil bord" },
  { href: "/om-os", label: "Om os" },
  { href: "/billeder", label: "Billeder" },
  { href: "/jobs", label: "Jobs" },
  { href: "/retningslinjer", label: "Retningslinjer" },
  { href: "/privatlivspolitik", label: "Privatlivspolitik" },
  { href: "/kontakt", label: "Kontakt" },
]

const HOURS = [
  ["Mandag – Torsdag", "12:00 – 21:00"],
  ["Fredag – Lørdag", "12:00 – 22:00"],
  ["Søndag", "12:00 – 21:00"],
]

export function Footer() {
  return (
    <footer className="relative bg-sumi text-white overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 text-gold pointer-events-none">
        <Seigaiha ground="#0E0F11" opacity={0.08} size={80} />
      </div>
      <div aria-hidden="true" className="relative text-gold/50">
        <WaveDivider height={12} rows={1} />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-14 pb-10">
        {/* Silver is the brand sheet's primary logo variant; gold is the alternate. */}
        <LockupVertical className="mb-14 text-silver-lit" markClass="w-24 h-12" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          <div>
            <p className="ji-eyebrow text-white/70 mb-4">Restaurant</p>
            <address className="not-italic ji-body text-sm leading-loose text-white/75">
              {SITE.street}<br />{SITE.city}
            </address>
            <a href={SITE.phoneHref} className="block mt-4 ji-accent text-xl tabular-nums text-white ji-link">
              {SITE.phoneDisplay}
            </a>
            <a href={`mailto:${SITE.email}`} className="block mt-1 ji-body text-sm text-white/70 hover:text-white transition-colors">
              {SITE.email}
            </a>
          </div>

          <div>
            <p className="ji-eyebrow text-white/70 mb-4">Åbningstider</p>
            <dl className="ji-body text-sm space-y-2 text-white/75">
              {HOURS.map(([d, t]) => (
                <div key={d} className="flex justify-between gap-4">
                  <dt>{d}</dt>
                  <dd className="text-white tabular-nums">{t}</dd>
                </div>
              ))}
            </dl>
          </div>

          <nav aria-label="Sidefod">
            <p className="ji-eyebrow text-white/70 mb-4">Sider</p>
            <ul className="ji-body text-sm space-y-2">
              {SIDER.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="text-white/70 hover:text-white transition-colors">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="ji-eyebrow text-white/70 mb-4">Følg og find os</p>
            <ul className="ji-body text-sm space-y-2">
              <li>
                <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                  Facebook
                </a>
              </li>
              <li>
                <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                  Rutevejledning
                </a>
              </li>
              <li>
                <a href={SITE.smiley} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                  Se kontrolrapport
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="relative border-t border-gold/20">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between gap-2 ji-accent text-[11px] text-white/60">
          {/* e-handelsloven §7: a trading business must show its legal name,
              address and CVR number. The CVR renders once it is configured. */}
          <span>
            © {new Date().getFullYear()} {SITE.name} · {SITE.street}, {SITE.city}
            {COMPANY.cvr ? ` · CVR ${COMPANY.cvr}` : ""} · Siden {SITE.founded}
          </span>
          {/* No staff link here on purpose.
              It is not what protects /kitchen — the PIN and middleware do that —
              but a link in the footer of every page puts the staff entrance in
              front of every visitor and every crawler. Staff bookmark it. */}
        </div>
      </div>
    </footer>
  )
}
