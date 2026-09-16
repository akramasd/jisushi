"use client"

import { useEffect } from "react"
import { Footer } from "@/components/footer"
import { AnimatedHeader } from "@/components/animated-header"
import { Phone } from "lucide-react"
import Image from "next/image"
import { SITE } from "@/lib/site"

export default function KontaktPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const cloudName = "dlt6bojfp"

  return (
    <div className="min-h-screen bg-sumi">
      <AnimatedHeader />

      <section className="relative h-[300px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-sumi">
          <Image
            src={`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/Sushi_4_fbjyaj`}
            alt="Contact background"
            fill
            className="object-cover opacity-40"
          />
        </div>
        <h1 className="relative z-10 ji-display text-[clamp(2.4rem,7vw,4rem)] text-center px-4 text-white">Kontakt</h1>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="bg-slate-ink p-12 md:p-16">
          <Phone className="w-16 h-16 text-gold mx-auto mb-8" />
          <h2 className="ji-display text-[clamp(1.7rem,4vw,2.6rem)] text-white mb-6">Ring til os</h2>
          <a
            href={SITE.phoneHref}
            className="text-gold text-4xl md:text-5xl hover:text-[#A8906A] transition-colors inline-block"
          >
            +45 {SITE.phoneDisplay}
          </a>
          <p className="ji-body text-[17px] leading-[1.85] text-white/75 mt-8">
            Vi er klar til at besvare dine spørgsmål og tage imod din reservation
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
