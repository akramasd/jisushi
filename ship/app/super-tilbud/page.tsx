"use client"

import { useEffect } from "react"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import { Phone } from "lucide-react"
import { SITE } from "@/lib/site"

export default function SuperTilbudPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-sumi">
      <AnimatedHeader />

      {/* Simple Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center">
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <h1 className="ji-display text-[clamp(2.4rem,7vw,4rem)] text-white mb-4">Super Tilbud</h1>
          <p className="text-xl md:text-2xl text-muted-ink tracking-wide">Take Away Menuer</p>
        </div>
      </section>

      {/* Clean Menu Cards */}
      <section className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Menu 1 */}
            <div className="group relative bg-gold overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gold/50 border border-gold bg-white">
              <div className="relative p-8">
                <h3 className="ji-display text-2xl text-sumi mb-4">Menu 1</h3>
                <div className="text-4xl text-sumi mb-1">300 kr</div>
                <div className="text-sumi/70 text-sm mb-6">36 stykker</div>

                <div className="h-px bg-sumi/20 mb-6" />

                <ul className="space-y-2 text-sumi text-sm leading-relaxed">
                  <li>8 stk. nigiri (2 stk. af hver: rejer, laks, tun og flamberet laks)</li>
                  <li>6 stk. futomaki med tempura rejer</li>
                  <li>6 stk. futomaki med tempura kylling</li>
                  <li>8 stk. Alaska med laks</li>
                  <li>8 stk. topping med tempurareje og flamberet laks</li>
                </ul>
              </div>
            </div>

            {/* Menu 2 - MOST POPULAR */}
            <div className="group relative bg-gold overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gold/50 border-2 border-white bg-background">
              <div className="absolute top-4 right-4 bg-sumi text-white px-3 py-1 rounded text-xs font-medium tracking-wider">
                POPULÆR
              </div>

              <div className="relative p-8">
                <h3 className="ji-display text-2xl text-sumi mb-4">Menu 2</h3>
                <div className="text-4xl text-sumi mb-1">530 kr</div>
                <div className="text-sumi/70 text-sm mb-6">70 stykker</div>

                <div className="h-px bg-sumi/20 mb-6" />

                <ul className="space-y-2 text-sumi text-sm leading-relaxed">
                  <li>12 stk. nigiri (3 stk. af hver: rejer, laks, tun og flamberet laks)</li>
                  <li>12 stk. futomaki med tempura rejer</li>
                  <li>6 stk. futomaki med tempura kylling</li>
                  <li>8 stk. Alaska med laks</li>
                  <li>8 stk. spicy rejer</li>
                  <li>8 stk. topping med tempurareje og flamberet laks</li>
                  <li>8 stk. topping rainbow med surimi</li>
                  <li>8 stk. hosomaki med agurk</li>
                </ul>
              </div>
            </div>

            {/* Menu 3 */}
            <div className="group relative bg-gold overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gold/50 border border-gold">
              <div className="relative p-8 bg-background">
                <h3 className="ji-display text-2xl text-sumi mb-4">Menu 3</h3>
                <div className="text-4xl text-sumi mb-1">750 kr</div>
                <div className="text-sumi/70 text-sm mb-6">104 stykker</div>

                <div className="h-px bg-sumi/20 mb-6" />

                <ul className="space-y-2 text-sumi text-sm leading-relaxed">
                  <li>16 stk. nigiri (4 stk. af hver: rejer, laks, tun og flamberet laks)</li>
                  <li>12 stk. futomaki med tempura rejer</li>
                  <li>12 stk. futomaki med tempura kylling</li>
                  <li>8 stk. Alaska med laks</li>
                  <li>8 stk. flying chicken</li>
                  <li>8 stk. spicy rejer</li>
                  <li>8 stk. spicy tun</li>
                  <li>8 stk. topping med tempurareje og flamberet laks</li>
                  <li>8 stk. topping rainbow med surimi</li>
                  <li>8 stk. hosomaki med agurk</li>
                  <li>8 stk. hosomaki med laks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA Section */}
      <section className="relative py-20 px-6">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="ji-display text-[clamp(1.7rem,4vw,2.6rem)] text-white mb-6">Bestil Dit Super Tilbud</h2>
          <p className="ji-body text-[17px] leading-[1.85] text-white/75 mb-12 max-w-2xl mx-auto">
            Ring til os og få din håndlavede sushi menu klar til afhentning.
          </p>

          <a
            href={SITE.phoneHref}
            className="inline-flex items-center gap-4 bg-white text-sumi px-10 py-4 text-lg hover:bg-gold hover:text-sumi transition-all duration-300"
          >
            <Phone size={24} />
            <span>{SITE.phoneDisplay}</span>
          </a>

          <p className="text-muted-ink mt-8 text-sm">{SITE.street}, {SITE.city}</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
