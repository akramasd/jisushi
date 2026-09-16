import Image from "next/image"
import { Footer } from "@/components/footer"
import { AnimatedHeader } from "@/components/animated-header"
import { NewYearBanner } from "@/components/new-year-banner"
import { SITE, restaurantJsonLd } from "@/lib/site"
import { FacebookFeed } from "@/components/facebook-feed"

/**
 * Facebook posts shown on the front page.
 *
 * These are pinned permalinks, so they do not refresh themselves — one of them
 * was a New Year message still on display eight months later. Worth a glance
 * whenever the page is touched.
 */
const FB_POSTS = [
  {
    href: "https://www.facebook.com/permalink.php?story_fbid=pfbid02cqCS6tKh8yLhx8BBMLReXGKivm97aJPAFFc6NikXwCy49RHWZsT9uQDcnA4YZadAl&id=100086615153169",
    caption: "Ji Sushi - Frederikshavn",
  },
  {
    href: "https://www.facebook.com/permalink.php?story_fbid=pfbid02pSNP9N9bSp7zEsizEMu1Tx1gQ9fCGRvMdKePUbce5bNseKdpAz67SEVPwqGiqYJZl&id=100086615153169",
    caption: "Ji Sushi - Frederikshavn",
  },
]
import { structuredHours } from "@/lib/opening-hours"

export default function Page() {
  const cloudName = "dwvvmlteg"

  return (
    <div className="min-h-screen bg-sumi">
      {/* Google reads this for the local-business panel. Generated from the
          same hours table the checkout enforces, so it cannot advertise
          opening times the system refuses to honour. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(restaurantJsonLd(structuredHours())),
        }}
      />
      <AnimatedHeader />

      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-sumi animate-fade-in">
          <Image
            src={`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/Sushi_4_woejxb`}
            alt="Fresh sushi"
            fill
            className="object-cover opacity-60"
            priority
          />
        </div>
        <h1 className="relative z-10 ji-display text-white text-[clamp(2.4rem,7vw,4.6rem)] leading-[1.06] font-normal text-center px-4 animate-fade-in-up">
          En moderne japansk restaurant
        </h1>
      </section>

      {/* New Year Banner */}
      <NewYearBanner />

      {/* Super Tilbud Take Away Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="ji-display text-[clamp(1.9rem,5vw,3rem)] font-normal mb-4 text-gold">Super Tilbud Take Away</h2>
          <p className="ji-body text-[17px] leading-[1.85] text-white/75">Vælg mellem vores 3 fantastiske takeaway menuer</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Menu 1 */}
          <div className="bg-slate-ink border border-white/15 p-6 transition-colors duration-300 hover:border-gold">
            <div className="text-center mb-6">
              <h3 className="ji-display text-gold text-2xl mb-2">Menu 1</h3>
              <p className="ji-display text-white text-4xl mb-1">300 kr</p>
              <p className="ji-body text-[15px] leading-[1.75] text-white/65">36 stk.</p>
            </div>
            <ul className="ji-body text-[15px] leading-[1.75] text-white/65 space-y-2">
              <li>• 8 stk. nigiri (2 stk. af hver: rejer, laks, tun og flamberet laks)</li>
              <li>• 6 stk. futomaki med tempura rejer</li>
              <li>• 6 stk. futomaki med tempura kylling</li>
              <li>• 8 stk. Alaska med laks</li>
              <li>• 8 stk. topping med tempurareje og flamberet laks</li>
            </ul>
          </div>

          {/* Menu 2 */}
          <div className="bg-slate-ink border-2 border-gold p-6 transition-colors duration-300">
            <div className="text-center mb-6">
              <div className="inline-block bg-gold text-sumi text-xs font-medium px-3 py-1 mb-2">
                POPULÆR
              </div>
              <h3 className="ji-display text-gold text-2xl mb-2">Menu 2</h3>
              <p className="ji-display text-white text-4xl mb-1">530 kr</p>
              <p className="ji-body text-[15px] leading-[1.75] text-white/65">70 stk.</p>
            </div>
            <ul className="ji-body text-[15px] leading-[1.75] text-white/65 space-y-2">
              <li>• 12 stk. nigiri (3 stk. af hver: rejer, laks, tun og flamberet laks)</li>
              <li>• 12 stk. futomaki med tempura rejer</li>
              <li>• 6 stk. futomaki med tempura kylling</li>
              <li>• 8 stk. Alaska med laks</li>
              <li>• 8 stk. spicy rejer</li>
              <li>• 8 stk. topping med tempurareje og flamberet laks</li>
              <li>• 8 stk. topping rainbow med surimi</li>
              <li>• 8 stk. hosomaki med agurk</li>
            </ul>
          </div>

          {/* Menu 3 */}
          <div className="bg-slate-ink border border-white/15 p-6 transition-colors duration-300 hover:border-gold">
            <div className="text-center mb-6">
              <h3 className="ji-display text-gold text-2xl mb-2">Menu 3</h3>
              <p className="ji-display text-white text-4xl mb-1">750 kr</p>
              <p className="ji-body text-[15px] leading-[1.75] text-white/65">104 stk.</p>
            </div>
            <ul className="ji-body text-[15px] leading-[1.75] text-white/65 space-y-2">
              <li>• 16 stk. nigiri (4 stk. af hver: rejer, laks, tun og flamberet laks)</li>
              <li>• 12 stk. futomaki med tempura rejer</li>
              <li>• 12 stk. futomaki med tempura kylling</li>
              <li>• 8 stk. Alaska med laks</li>
              <li>• 8 stk. flying chicken</li>
              <li>• 8 stk. spicy rejer</li>
              <li>• 8 stk. spicy tun</li>
              <li>• 8 stk. topping med tempurareje og flamberet laks</li>
              <li>• 8 stk. topping rainbow med surimi</li>
              <li>• 8 stk. hosomaki med agurk</li>
              <li>• 8 stk. hosomaki med laks</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-8">
          <a
            href="tel:31334486"
            className="inline-block ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold hover:bg-gold-lit text-sumi px-8 py-4 transition-colors"
          >
            Ring og Bestil: {SITE.phoneDisplay}
          </a>
        </div>
      </section>

      {/* Frisk og Lækker Sushi Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-square group">
          <Image
            src={`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/476297839_589640257266474_4179298734876294183_n_adivfr`}
            alt="Sushi platter"
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="text-muted-ink">
          <h2 className="ji-display text-[clamp(1.7rem,4vw,2.6rem)] font-normal mb-6 text-white">Frisk og Lækker Sushi</h2>
          <p className="leading-relaxed text-base">
            Vores koncept er kvalitet og kreativitet. Vi gir meget op i kvalitet, derfor bliver der altid fokuseret på
            de bedste råvarer. Vores mål er at præsentere vores gæster for unikke og eksklusive oplevelser fra det
            japanske køkken.
          </p>
        </div>
      </section>

      {/* All You Can Eat Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="ji-display text-[clamp(1.7rem,4vw,2.6rem)] font-normal mb-4 text-white">All you can eat</h2>
        <p className="text-gold text-xl mb-8">Sushi Ad Libitum</p>
        <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
          <div className="price-card bg-slate-ink border border-white/15 p-6 transition-colors duration-300 hover:border-gold">
            <h3 className="ji-display text-gold text-2xl mb-2">Frokost</h3>
            <p className="ji-display text-white text-3xl mb-2">239,-</p>
            <p className="ji-body text-[15px] leading-[1.75] text-white/65">(12:00 – 15:00)</p>
          </div>
          <div className="price-card bg-slate-ink border border-white/15 p-6 transition-colors duration-300 hover:border-gold">
            <h3 className="ji-display text-gold text-2xl mb-2">Aften</h3>
            <p className="ji-display text-white text-3xl mb-2">269,-</p>
            <p className="ji-body text-[15px] leading-[1.75] text-white/65">(15:00 – Lukket)</p>
          </div>
        </div>
        <div className="bg-slate-ink p-8 max-w-2xl mx-auto mb-4">
          <p className="ji-body text-[16px] leading-[1.8] text-white/70">
            Ji Sushi ad libitum er et koncept, hvor du kan spise dig mæt i din yndlingssushi, varme retter. Du kan
            bestille alt du har lyst til, præcis det du har lyst til, og dushen bliver serveret absolut frisklavet til
            dig.
          </p>
        </div>
        <p className="ji-body text-[15px] leading-[1.75] text-white/65 italic">*Børn under 11 år halv pris</p>
      </section>

      {/* Quote Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <blockquote className="text-muted-ink text-xl md:text-2xl italic">
          "Et bid af Japansk kultur"
        </blockquote>
      </section>

      {/* Facebook — loaded only on request; see components/facebook-feed.tsx */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="ji-display text-[clamp(1.7rem,4vw,2.6rem)] font-normal mb-12 text-center text-white">
          Følg os på Facebook
        </h2>
        <FacebookFeed posts={FB_POSTS} />
      </section>

      {/* Footer Component */}
      <Footer />
    </div>
  )
}
