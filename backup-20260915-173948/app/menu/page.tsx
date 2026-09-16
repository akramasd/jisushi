"use client"

import Link from "next/link"
import { SITE } from "@/lib/site"
import { Footer } from "@/components/footer"
import { AnimatedHeader } from "@/components/animated-header"
import { useState, useEffect } from "react"
import { CldImage } from "next-cloudinary"
import Image from "next/image"

export default function MenuPage() {
  //"drinks" was missing from this union while the page compared against it at
  // line ~817, so that whole section was unreachable dead code — and TypeScript
  // said so, silently, because build errors were suppressed.
  const [activeTab, setActiveTab] = useState<"allyoucaneat" |"takeaway" |"drinks">("allyoucaneat")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior:"smooth" })
  }, [activeTab])

  return (
    <div className="min-h-screen bg-sumi">
      <AnimatedHeader />

      {/* Page Hero */}
      <section className="relative h-[300px] flex items-center justify-center bg-gradient-to-b from-sumi-raise to-sumi">
        <h1 className="relative z-10 ji-display text-white text-[clamp(2.4rem,7vw,4rem)] text-center px-4">Menu</h1>
      </section>

      

      <div className="sticky top-0 z-40 bg-slate-ink shadow-lg">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-2 md:gap-4">
            {(
              [
                ["allyoucaneat","All You Can Eat"],
                ["takeaway","Takeaway"],
                ["drinks","Drikkevarer"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                aria-current={activeTab === key ?"true" : undefined}
                className={`flex-1 py-4 px-4 text-base md:text-lg font-medium transition-all duration-300 border-b-2 ${
                  activeTab === key
                    ?"text-gold border-gold"
                    :"text-muted-ink border-transparent hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 py-16">
        {activeTab === "allyoucaneat" && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <p className="ji-eyebrow text-white/60">Spis i restauranten</p>
              <h2 className="ji-display text-[clamp(2rem,6vw,3.2rem)] text-gold mt-4">Sushi Ad Libitum</h2>
              <p className="ji-body text-[17px] leading-[1.85] text-white/75 mt-6 max-w-xl mx-auto">
                Spis så meget du vil, friskrullet undervejs. Alt bestilles ved bordet
                og laves når du beder om det — intet står klar på en buffet.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 mb-14">
              <div className="border border-white/20 p-8 text-center hover:border-gold transition-colors">
                <p className="ji-eyebrow text-white/60">Frokost</p>
                <p className="ji-display text-[3.2rem] leading-none text-white my-4 tabular-nums">239<span className="text-2xl text-white/60">,-</span></p>
                <p className="ji-accent text-sm text-white/70">12:00 – 15:00</p>
              </div>
              <div className="border border-white/20 p-8 text-center hover:border-gold transition-colors">
                <p className="ji-eyebrow text-white/60">Aften</p>
                <p className="ji-display text-[3.2rem] leading-none text-white my-4 tabular-nums">269<span className="text-2xl text-white/60">,-</span></p>
                <p className="ji-accent text-sm text-white/70">15:00 – lukketid</p>
              </div>
            </div>

            <div className="border-t border-white/15 pt-10">
              <h3 className="ji-display text-2xl text-gold mb-6">Sådan foregår det</h3>
              <ul className="ji-body text-[16px] leading-[1.9] text-white/75 space-y-3">
                <li className="flex gap-4">
                  <span className="text-gold tabular-nums shrink-0">01</span>
                  <span>Bestil direkte ved bordet, så mange runder du vil.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-gold tabular-nums shrink-0">02</span>
                  <span>Alt rulles, når du bestiller det — derfor tager hver runde et øjeblik.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-gold tabular-nums shrink-0">03</span>
                  <span>Ad libitum gælder hele bordet. Vi kan ikke blande med à la carte.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-gold tabular-nums shrink-0">04</span>
                  <span>Børn under 11 år spiser til halv pris.</span>
                </li>
              </ul>

              <p className="ji-body text-[15px] leading-[1.8] text-white/55 mt-8">
                Vi beder om, at maden bliver spist — der beregnes et tillæg for
                større mængder levnet mad. Det står nærmere i{" "}
                <Link href="/retningslinjer" className="text-gold ji-link">vores retningslinjer</Link>.
              </p>

              <div className="flex flex-wrap gap-3 mt-10">
                <Link
                  href="/booking"
                  className="ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold text-sumi px-7 py-4"
                >
                  Book et bord
                </Link>
                <a
                  href={SITE.phoneHref}
                  className="ji-accent text-[13px] tracking-[0.2em] uppercase border border-white/30 px-7 py-4 hover:border-gold hover:text-gold transition-colors"
                >
                  Ring {SITE.phoneDisplay}
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "takeaway" && (
          <div className="space-y-20">
            {/* Reading the menu is not ordering. Without this the tab is a
                dead end: the whole list, and no way to act on it. */}
            <div className="border border-gold/40 bg-gold/[0.06] p-6 sm:p-8 text-center">
              <p className="ji-body text-[17px] leading-[1.8] text-white/85">
                Du kan bestille alt herfra direkte online — vi pakker det klar til afhentning.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <Link
                  href="/takeaway"
                  className="ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold text-sumi px-7 py-4"
                >
                  Bestil takeaway
                </Link>
                <a
                  href={SITE.phoneHref}
                  className="ji-accent text-[13px] tracking-[0.2em] uppercase border border-white/30 px-7 py-4 hover:border-gold hover:text-gold transition-colors"
                >
                  Ring {SITE.phoneDisplay}
                </a>
              </div>
              <p className="ji-body text-[14px] text-white/55 mt-5">
                Priser og udsolgte retter opdateres løbende på bestillingssiden.
              </p>
            </div>

            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Forretter</h2>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Edamame Card with Image */}
                <div className="bg-slate-ink overflow-hidden hover:-translate-y-2 hover:border-gold transition-all duration-300">
                  <div className="relative h-48">
                    <CldImage
                      src="forretter/edamame"
                      alt="Edamame bønner"
                      fill
                      className="object-cover"
                      crop={{
                        type:"auto",
                        source: true,
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal text-lg">1. Edamame bønner</h4>
                      <span className="text-gold font-normal text-xl ml-4">45,-</span>
                    </div>
                  </div>
                </div>

                {/* Spring Rolls Card with Image */}
                <div className="bg-slate-ink overflow-hidden hover:-translate-y-2 hover:border-gold transition-all duration-300">
                  <div className="relative h-48">
                    <CldImage
                      src="forretter/spring-rolls"
                      alt="Forårs ruller"
                      fill
                      className="object-cover"
                      crop={{
                        type:"auto",
                        source: true,
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal text-lg">2. Forårs ruller</h4>
                      <span className="text-gold font-normal text-xl ml-4">48,-</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rest of Forretter in compact list format */}
              <div className="bg-slate-ink p-6 md:p-8 max-w-3xl mx-auto">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-muted-ink">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">3. Friteret rejer med chili</h4>
                    </div>
                    <span className="text-gold font-normal ml-4">58,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">4. Friteret kylling med sød chilisauce</h4>
                    </div>
                    <span className="text-gold font-normal ml-4">68,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">5. Dim Sum</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">5 stk.</p>
                    </div>
                    <span className="text-gold font-normal ml-4">45,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">6. Gyoza</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">5 stk.</p>
                    </div>
                    <span className="text-gold font-normal ml-4">45,-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticks Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Sticks</h2>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="bg-slate-ink p-6 md:p-8 order-1 md:order-2">
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">1 stk.</p>
                  <div className="space-y-4 text-muted-ink">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">7. Kyllingefilet</h4>
                      <span className="text-gold font-normal ml-4">33,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">8. Oksekød</h4>
                      <span className="text-gold font-normal ml-4">38,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">9. Lam</h4>
                      <span className="text-gold font-normal ml-4">38,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">10. Kæmpe tigerreje</h4>
                      <span className="text-gold font-normal ml-4">35,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">11. Laks</h4>
                      <span className="text-gold font-normal ml-4">35,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">12. Kylling kødboller</h4>
                      <span className="text-gold font-normal ml-4">30,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">13. Asparges med bacon</h4>
                      <span className="text-gold font-normal ml-4">35,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">14. Squash</h4>
                      <span className="text-gold font-normal ml-4">25,-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sashimi Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Sashimi</h2>
              <div className="bg-slate-ink p-6 md:p-8 max-w-3xl mx-auto">
                <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">Serveres med ris</p>
                <div className="space-y-4 text-muted-ink">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">15. Laks Sashimi</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">6 skiver</p>
                    </div>
                    <span className="text-gold font-normal ml-4">85,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">16. Tun Sashimi</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">6 skiver</p>
                    </div>
                    <span className="text-gold font-normal ml-4">89,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">17. Sashimi Menu</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">12 skiver og 5 tigerrejer</p>
                    </div>
                    <span className="text-gold font-normal ml-4">205,-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Toppet Maki Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Toppet Maki</h2>
              <div className="bg-slate-ink p-6 md:p-8 max-w-4xl mx-auto">
                <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">8 stk.</p>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-muted-ink">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">18. Tempura Rejer Tun Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Tempura rejer, avocado og agurk, toppet med tun og spicy mayo
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">125,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">19. Tempura Rejer Grillet Laks Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Tempura rejer, avocado og mango, toppet med grillet laks og spicy mayo
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">125,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">20. Tempura Rejer Avocado Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Tempura rejer, avocado og agurk, toppet med avocado og teriyaki
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">125,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">21. Tempura Rejer Rainbow Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Tempura rejer, avocado og agurk, toppet med laks, tun, rejer, hvidfisk og bønnespirer
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">125,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">22. Tempura Kylling Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Tempura kylling og agurk, toppet med avocado og spicy mayo
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">120,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">23. Vegetar Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Salat mix, tofu, agurk og avocado, toppet med tangsalat og chili sesamfrø
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">115,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">24. Grillet Laks Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Laks, avocado og agurk, toppet med grillet laks og forårsløg
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">125,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">25. Laks Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laks, avocado og agurk, toppet med laks og forårsløg</p>
                    </div>
                    <span className="text-gold font-normal ml-4">125,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">26. Laks Avocado Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laksemousse og tobiko, toppet med forårsløg og avocado</p>
                    </div>
                    <span className="text-gold font-normal ml-4">120,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">27. Rainbow Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Surimi, avocado og agurk, toppet med laks, rejer og hvidfisk
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">120,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">28. Tun Avocado Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Tun og tobiko, toppet med tun og forårsløg</p>
                    </div>
                    <span className="text-gold font-normal ml-4">120,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">29. Tempura Surimi Deluxe Roll</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Tempura surimi, avocado og agurk, toppet med bønnespirer</p>
                    </div>
                    <span className="text-gold font-normal ml-4">120,-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Uramaki Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Uramaki</h2>
              <div className="bg-slate-ink p-6 md:p-8 max-w-4xl mx-auto">
                <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">8 stk.</p>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-muted-ink">
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">30. Sesamfrø Ebi Tempura</h4>
                    <span className="text-gold font-normal ml-4">93,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">31. San Francisco</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laks, avocado, agurk, basilikum og ørredrogn</p>
                    </div>
                    <span className="text-gold font-normal ml-4">90,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">32. Super California</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Krebsehaler, avocado, agurk og tobiko</p>
                    </div>
                    <span className="text-gold font-normal ml-4">90,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">33. Alaska</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laks, flødeost, avocado, agurk og tobiko</p>
                    </div>
                    <span className="text-gold font-normal ml-4">90,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">34. California</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Surimi, avocado, agurk og sesamfrø</p>
                    </div>
                    <span className="text-gold font-normal ml-4">80,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">35. Spicy Laks</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laks, flødeost, agurk, avocado og tobiko</p>
                    </div>
                    <span className="text-gold font-normal ml-4">83,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">36. Spicy Rejer</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Tigerrejer, spicy sauce, agurk, avocado og sesamfrø</p>
                    </div>
                    <span className="text-gold font-normal ml-4">85,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">37. Spicy Tun</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Tun, spicy sauce, agurk, avocado og sesamfrø</p>
                    </div>
                    <span className="text-gold font-normal ml-4">85,-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hosomaki & Futomaki Section */}
            <div>
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-ink p-6 md:p-8">
                  <h2 className="ji-display text-gold text-[clamp(1.5rem,3.5vw,2.1rem)] mb-6">Hosomaki</h2>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">8 stk.</p>
                  <div className="space-y-4 text-muted-ink">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">38. Tigerrejer</h4>
                      <span className="text-gold font-normal ml-4">53,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">39. Tun</h4>
                      <span className="text-gold font-normal ml-4">50,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">40. Laks</h4>
                      <span className="text-gold font-normal ml-4">50,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">41. Agurk</h4>
                      <span className="text-gold font-normal ml-4">43,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">42. Avocado</h4>
                      <span className="text-gold font-normal ml-4">43,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">43. Tun med avocado</h4>
                      <span className="text-gold font-normal ml-4">53,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-normal">44. Laks med avocado</h4>
                      <span className="text-gold font-normal ml-4">53,-</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-ink p-6 md:p-8">
                  <h2 className="ji-display text-gold text-[clamp(1.5rem,3.5vw,2.1rem)] mb-6">Futomaki</h2>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">5 stk.</p>
                  <div className="space-y-4 text-muted-ink">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">45. Yami Ebi Rejer</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Ebi rejer, avocado og mango</p>
                      </div>
                      <span className="text-gold font-normal ml-4">73,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">46. Tempura Rejer</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Ebi rejer, avocado og agurk</p>
                      </div>
                      <span className="text-gold font-normal ml-4">70,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">47. Spicy Rejer</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Tigerrejer, avocado og agurk</p>
                      </div>
                      <span className="text-gold font-normal ml-4">70,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">48. Big Alaska</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laks, flødeost, avocado, agurk og tobiko</p>
                      </div>
                      <span className="text-gold font-normal ml-4">70,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">49. California Laks</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Surimi, laks, avocado og agurk</p>
                      </div>
                      <span className="text-gold font-normal ml-4">73,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">50. Spicy Laks</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laks, avocado og agurk</p>
                      </div>
                      <span className="text-gold font-normal ml-4">70,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">51. Spicy Tun</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Tun, agurk og avocado</p>
                      </div>
                      <span className="text-gold font-normal ml-4">73,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">52. California</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Surimi, avocado og agurk</p>
                      </div>
                      <span className="text-gold font-normal ml-4">65,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-normal">53. Vegetar</h4>
                        <p className="ji-body text-[15px] leading-[1.75] text-white/65">Avocado, agurk, tofu og salat mix</p>
                      </div>
                      <span className="text-gold font-normal ml-4">60,-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nigiri Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Nigiri</h2>
              <div className="bg-slate-ink p-6 md:p-8 max-w-4xl mx-auto">
                <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">1 stk.</p>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-muted-ink">
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">54. Laks</h4>
                    <span className="text-gold font-normal ml-4">22,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">55. Grillet Laks</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">56. Laks med Avocado</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">57. Grillet Laks med Bønnespirer</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">58. Tun</h4>
                    <span className="text-gold font-normal ml-4">22,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">59. Tun Tataki</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">60. Tun med Avocado</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">61. Tun med Forårsløg</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">62. Hvidfisk</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">63. Tigerrejer</h4>
                    <span className="text-gold font-normal ml-4">22,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">64. Tigerrejer med Spicy Sauce</h4>
                    <span className="text-gold font-normal ml-4">24,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">65. Krebsehaler</h4>
                    <span className="text-gold font-normal ml-4">27,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">66. Laks Gunkan</h4>
                    <span className="text-gold font-normal ml-4">27,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">67. Ørredrogn</h4>
                    <span className="text-gold font-normal ml-4">27,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">68. Avocado</h4>
                    <span className="text-gold font-normal ml-4">20,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">69. Agurk</h4>
                    <span className="text-gold font-normal ml-4">17,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">70. Inari Tofu</h4>
                    <span className="text-gold font-normal ml-4">22,-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rispapir Ruller Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Rispapir Ruller</h2>
              <div className="bg-slate-ink p-6 md:p-8 max-w-4xl mx-auto">
                <p className="ji-body text-[15px] leading-[1.75] text-white/65 mb-6">8 stk.</p>
                <div className="space-y-4 text-muted-ink">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">71. Rispapir Laks</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Laks, salat mix, agurk og avocado med spicy sauce</p>
                    </div>
                    <span className="text-gold font-normal ml-4">85,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">72. Rispapir Ebi Rejer</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Ebi rejer, salat mix, agurk og avocado med spicy sauce og teriyaki sauce
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">85,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">73. Rispapir Tempura Kylling</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                        Tempura kylling, salat mix, agurk og avocado med spicy sauce og goma sauce
                      </p>
                    </div>
                    <span className="text-gold font-normal ml-4">85,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-normal">74. Rispapir Oksekød</h4>
                      <p className="ji-body text-[15px] leading-[1.75] text-white/65">Oksekød, salat mix, agurk og avocado med teriyaki sauce</p>
                    </div>
                    <span className="text-gold font-normal ml-4">85,-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sushi Box Menuer Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Sushi Box Menuer</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">Menu - 8 stk.</h3>
                    <span className="text-gold font-normal text-xl">138,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">30. Laks med avocado, 31. Grillet laks, 32. Tun</p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">Vegetar Menu - 18 stk.</h3>
                    <span className="text-gold font-normal text-xl">168,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    33. Toppet maki: vegetar Roll med avocado, 34. Hosomaki: agurk, 35. Nigiri: 1 tofu, 1 agurk
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">10 Box - 10 stk.</h3>
                    <span className="text-gold font-normal text-xl">120,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    36. Uramaki: ebi tempura rejer med sesamfrø, 37. Nigiri: laks
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">20 Box - 20 stk.</h3>
                    <span className="text-gold font-normal text-xl">260,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    38. Uramaki: ebi tempura rejer med sesamfrø, 39. Uramaki: spicy laks, 40. Nigiri: 2 laks, 2 tun
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">Ebi Tempura Menu - 24 stk.</h3>
                    <span className="text-gold font-normal text-xl">328,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    41. Deluxe ebi tempura rejer med avocado, 42. Deluxe ebi tempura rejer med laks, 43. Deluxe ebi
                    tempura rejer med regnbue
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">30 Box - 30 stk.</h3>
                    <span className="text-gold font-normal text-xl">360,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    44. Uramaki: ebi tempura rejer med sesamfrø, 45. Uramaki: spicy laks, 46. Toppet maki: rainbow roll,
                    47. Nigiri: 2 laks, 2 tun, 2 rejer
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">Uramaki Menu - 32 stk.</h3>
                    <span className="text-gold font-normal text-xl">388,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    48. Ebi tempura rejer med sesamfrø, 49. Laks deluxe roll, 50. Rainbow roll, 51. Alaska roll
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">40 Box - 40 stk.</h3>
                    <span className="text-gold font-normal text-xl">460,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    52. Uramaki: California, 53. Uramaki: Spicy laks, 54. Toppet maki: Ebi tempura rejer med avocado,
                    55. Nigiri: 4 laks, 4 tun, 4 rejer, 4 grillet laks
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">50 Box - 50 stk.</h3>
                    <span className="text-gold font-normal text-xl">600,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    56. Uramaki: Spicy laks, 57. Uramaki: California, 58. Toppet maki: Ebi tempura med avocado, 59.
                    Toppet maki: Laks deluxe roll, 60. Nigiri: 4 laks, 4 tun, 4 rejer, 4 grillet laks, 2 avocado
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">60 Box - 60 stk.</h3>
                    <span className="text-gold font-normal text-xl">700,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    61. Uramaki: Spicy tun, 62. Uramaki: Alaska, 63. Toppet maki: Ebi tempura med avocado, 64. Toppet
                    maki: Laks deluxe roll, 65. Rainbow roll, 66. Nigiri: 5 laks, 5 tun, 5 rejer, 5 grillet laks
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">70 Box - 70 stk.</h3>
                    <span className="text-gold font-normal text-xl">820,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    67. Uramaki: Spicy tun, 68. Uramaki: Alaska, 69. Toppet maki: Ebi tempura med avocado, 70. Toppet
                    maki: Ebi tempura med laks, 71. Toppet maki: Rainbow roll, 72. Toppet maki: Laks deluxe roll, 73.
                    Nigiri: 5 laks, 5 tun, 5 rejer, 5 grillet laks, 2 krebsehaler
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">80 Box - 80 stk.</h3>
                    <span className="text-gold font-normal text-xl">950,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">
                    74. Uramaki: Spicy tun, 75. Uramaki: Alaska, 76. Uramaki: California, 77. Topping maki: Ebi tempura
                    med avocado, 78. Topping maki: Ebi tempura med laks, 79. Topping maki: Rainbow roll, 80. Topping
                    maki: Laks deluxe roll, 81. Nigiri: 5 laks, 5 tun, 5 rejer, 5 grillet laks, 4 krebsehaler
                  </p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">Box 90 - 90 stk.</h3>
                    <span className="text-gold font-normal text-xl">1050,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">Box menuen sammensættes af sushikok</p>
                </div>

                <div className="bg-slate-ink p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="ji-display text-white text-xl">Box 100 - 100 stk.</h3>
                    <span className="text-gold font-normal text-xl">1200,-</span>
                  </div>
                  <p className="ji-body text-[15px] leading-[1.75] text-white/65">Box menuen sammensættes af sushikok</p>
                </div>
              </div>
            </div>

            {/* Tilbehør Section */}
            <div>
              <h2 className="ji-display text-gold text-[clamp(1.7rem,4vw,2.6rem)] mb-12 text-center">Tilbehør</h2>
              <div className="bg-slate-ink p-6 md:p-8 max-w-3xl mx-auto">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-muted-ink">
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">82. Goma dressing</h4>
                    <span className="text-gold font-normal ml-4">10,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">83. Hjemmelavet wasabi-mayo</h4>
                    <span className="text-gold font-normal ml-4">10,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">84. Hjemmelavet chili-mayo</h4>
                    <span className="text-gold font-normal ml-4">10,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">85. Hjemmelavet teriyaki</h4>
                    <span className="text-gold font-normal ml-4">10,-</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-normal">86. Sød chilisauce</h4>
                    <span className="text-gold font-normal ml-4">10,-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "drinks" && (
          <div className="space-y-12">
            {/* Wines moved to /vinmenu — they were duplicated here while that page
                said "coming soon". */}
            <div className="border border-gold/40 bg-gold/[0.06] p-6 md:p-8">
              <h3 className="ji-display text-2xl text-gold mb-3">Vin</h3>
              <p className="ji-body text-[16px] leading-[1.8] text-white/80">
                Bobler, hvidvin, rosé og rødvin står på vinkortet.
              </p>
              <Link
                href="/vinmenu"
                className="inline-block mt-6 ji-accent text-[13px] tracking-[0.2em] uppercase border border-gold text-gold px-7 py-4 hover:bg-gold hover:text-sumi transition-colors"
              >
                Se vinmenuen
              </Link>
            </div>

            {/* Øl Section */}
            <div className="bg-slate-ink p-6 md:p-8">
              <h3 className="ji-display text-white text-2xl mb-6 border-b border-gold pb-3">Øl</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Japansk Sapporo Øl, Large</h4>
                  </div>
                  <span className="text-gold font-medium ml-4 whitespace-nowrap">85,-</span>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Kirin Ichiban</h4>
                  </div>
                  <span className="text-gold font-medium ml-4 whitespace-nowrap">50,-</span>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Iki Beer</h4>
                  </div>
                  <span className="text-gold font-medium ml-4 whitespace-nowrap">50,-</span>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Carlsberg Alcohol Free</h4>
                  </div>
                  <span className="text-gold font-medium ml-4 whitespace-nowrap">50,-</span>
                </div>

                <div className="mt-6 pt-6 border-t border-[#6E747A]">
                  <h4 className="text-white font-medium mb-3">Fadøl</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-ink">Carlsberg Pilsner</span>
                      <div className="flex gap-4">
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Lille <span className="text-gold">45,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Mellem <span className="text-gold">60,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Stor <span className="text-gold">88,-</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-ink">Tuborg Classic</span>
                      <div className="flex gap-4">
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Lille <span className="text-gold">48,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Mellem <span className="text-gold">65,-</span>
                        </span>
                        <span className="text-gold text-sm">
                          Stor <span className="text-gold">92,-</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-ink">Grimbergen</span>
                      <span className="text-gold">50 cl 75,-</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-ink">1664 Kronenbourg Blanc</span>
                      <span className="text-gold">50 cl 75,-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spiritus Section */}
            <div className="bg-slate-ink p-6 md:p-8">
              <h3 className="ji-display text-white text-2xl mb-6 border-b border-gold pb-3">Spiritus</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-3">Rom</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Bacardi White</span>
                      <span className="text-gold text-sm">2 cl. 60,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Ron Varadero Silver Dry</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Gin</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Gilbeys</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">MG Rosa</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Vodka</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Absolut Blå</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Smirnoff</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Whisky</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Lauders Queen Mary</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Glen Silver Malt</span>
                      <span className="text-gold text-sm">2 cl. 35,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Chivas 12</span>
                      <span className="text-gold text-sm">2 cl. 40,-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Likør</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Baileys Irish</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Cointreau</span>
                      <span className="text-gold text-sm">2 cl. 35,-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Bitter</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Gammel Dansk</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Jägermeister</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Campari</span>
                      <span className="text-gold text-sm">2 cl. 30,-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Cognac Excellent</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Reviseur XO Cognac</span>
                      <span className="text-gold text-sm">4 cl. 128,-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">Reviseur VSOP Cognac</span>
                      <span className="text-gold text-sm">4 cl. 98,-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Sake</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="ji-body text-[15px] leading-[1.75] text-white/65">10 cl</span>
                      <span className="text-gold text-sm">100,-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sodavand & Varme Drikke Section */}
            <div className="bg-slate-ink p-6 md:p-8">
              <h3 className="ji-display text-white text-2xl mb-6 border-b border-gold pb-3">
                Sodavand & Varme Drikke
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-white font-medium mb-3">Sodavand</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-ink">Coca Cola / Coca Cola Zero / Fanta</span>
                      <div className="flex gap-4">
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Lille <span className="text-gold">45,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Mellem <span className="text-gold">50,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Stor <span className="text-gold">68,-</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-ink">Sprite / Schweppes Lemon</span>
                      <div className="flex gap-4">
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Lille <span className="text-gold">45,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Mellem <span className="text-gold">50,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Stor <span className="text-gold">68,-</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-ink">Danskvand </span>
                      <div className="flex gap-4">
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65 mx-3.5">
                          Lille <span className="text-gold">45,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Mellem <span className="text-gold">50,-</span>
                        </span>
                        <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                          Stor <span className="text-gold">68,-</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-ink">Ramune (Japansk Sodavand) Melon/Jordbær/Blåbær</span>
                      <span className="text-gold">Flaske 50,-</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#6E747A]">
                  <h4 className="text-white font-medium mb-3">Økologiske Drikke</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-ink">Hyldeblomst</span>
                      <span className="text-gold">50,-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Footer CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="ji-body text-[17px] leading-[1.85] text-white/75 mb-6">Klar til at opleve autentisk japansk gastronomi?</p>
        <Link
          href="/booking"
          className="inline-block bg-gold text-white px-8 py-3 font-normal hover:bg-[#A8906A] transition-colors"
        >
          Bestil Bord
        </Link>
      </section>

      <Footer />
    </div>
  )
}
