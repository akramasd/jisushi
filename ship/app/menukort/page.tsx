import type { Metadata } from "next"
import Link from "next/link"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import Seigaiha from "@/components/brand/seigaiha"
import WaveDivider from "@/components/brand/wave-divider"
import ScanViewer from "./scan-viewer"
import { MENU_SCANS } from "@/lib/site"

export const metadata: Metadata = {
  title: "Menukort",
  description: "Se hele menukortet fra Ji Sushi Frederikshavn.",
  alternates: { canonical: "/menukort" },
}

export default function MenukortPage() {
  return (
    <div className="min-h-screen bg-sumi text-white flex flex-col">
      <AnimatedHeader />
      <main id="indhold" className="flex-1">
        <section className="relative overflow-hidden border-b border-white/10">
          <div aria-hidden="true" className="absolute inset-0 text-gold pointer-events-none">
            <Seigaiha ground="#0E0F11" opacity={0.09} size={84} />
          </div>
          <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12">
            <div className="flex items-baseline justify-between gap-6">
              <p className="ji-eyebrow text-white/70">Menukort</p>
              <p aria-hidden="true" className="ji-kanji text-sm text-white/60">お品書き</p>
            </div>
            <h1 className="ji-display text-[clamp(2.4rem,7vw,4.4rem)] leading-[1.06] mt-4">
              Hele kortet
            </h1>
            <div aria-hidden="true" className="my-8 max-w-[13rem] text-gold">
              <WaveDivider height={11} rows={2} />
            </div>
            <p className="ji-body text-[18px] leading-[1.85] text-white/75 max-w-xl">
              Menukortet som det ser ud i restauranten. Tryk på et kort for at se det stort — eller{" "}
              <Link href="/takeaway" className="text-gold ji-link">bestil online</Link>.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-14">
          <ScanViewer scans={MENU_SCANS} />
        </section>
      </main>
      <Footer />
    </div>
  )
}
