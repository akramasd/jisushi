import type { Metadata } from "next"
import Link from "next/link"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import { SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: "Vinmenu",
  description: "Bobler, hvidvin, rosé og rødvin hos Ji Sushi i Frederikshavn.",
}

/**
 * The wine list.
 *
 * These wines were previously only on the drinks tab of /menu, while this page
 * said "Kommer snart" — a coming-soon notice sitting in front of content that
 * was already written. They live here now, and /menu points at it.
 */
export default function Vinmenu() {
  return (
    <div className="min-h-screen bg-sumi text-white flex flex-col">
      <AnimatedHeader />

      <main id="indhold" className="flex-1">
        <section className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center mb-14">
            <p className="ji-eyebrow text-white/60">Til maden</p>
            <h1 className="ji-display text-[clamp(2rem,6vw,3.2rem)] text-gold mt-4">Vinmenu</h1>
            <p className="ji-body text-[17px] leading-[1.85] text-white/75 mt-6 max-w-xl mx-auto">
              Et lille, udvalgt kort. Spørg endelig personalet — vi anbefaler
              gerne noget, der passer til det, du har bestilt.
            </p>
          </div>

          <div className="space-y-10">
        {/* Bobler Section */}
                    <div className="border border-white/15 p-6 md:p-8">
                      <h3 className="ji-display text-2xl text-gold mb-6 pb-3 border-b border-white/15">Bobler</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Moscato Spumante, Conti D'Elsa, Italien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Luksus-Asti Sødmefyldt duft af modne frugter. God balance mellem det søde og det friske. Moscato
                              er fremragende til lette desserter eller et glas uden mad. Sød.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">298,-</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Patriarche Bourgogne Brut, Frankrig</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Aromaen er elegant og udtryksfuld med noter af citrus og tørret frugt. Den harmoniske smag med fin
                              frugt afsluttes af en vedvarende, fydig eftersmag. Tør, men dejlig afrundet.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">388,-</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Lanson, Black Label Brut, Champagne Frankrig</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Aromaen er elegant og udtryksfuld med noter af citrus og tørret frugt. Den harmoniske smag med fin
                              frugt afsluttes af en vedvarende, fydig eftersmag. Tør, men dejlig afrundet.
                            </p>
                            <div className="flex gap-8 mt-2">
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Halv fl. <span className="text-gold">388,-</span>
                              </span>
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Flaske <span className="text-gold">588,-</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
        
                    
        {/* Hvidvin Section */}
                    <div className="border border-white/15 p-6 md:p-8">
                      <h3 className="ji-display text-2xl text-gold mb-6 pb-3 border-b border-white/15">Hvidvin</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Hunter's Creek Chardonnay, Australien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              De fuldmodne druer giver her en aromatisk hvidvin med en lækker aroma af tropisk frugt. Vinen er
                              ganske fyldig og kombinerer elegant den bløde fylde med et flot, frisk pift af citrus. Halvtør.
                            </p>
                            <div className="flex gap-8 mt-2">
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Glas <span className="text-gold">65,-</span>
                              </span>
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Flaske <span className="text-gold">258,-</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Le Morette Serai Bianco, Italien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              En elegant og balanceret duft med toner af hyldeblomster, pærer og abrikoser. Smagen er medium
                              fyldig og har en frugtrig og lang eftersmag med nuancer af citrusfrugter. Dejlig frugtrig og
                              halvtør.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">298,-</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Riesling Dopff Au Moulin, Frankrig</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              En elegant frugtagtig aroma med lemon, grape og fersken, men også noter af hvide blomster. Smagen
                              er tør, intens og frisk, med god fyldig struktur og elegant citrus i eftersmagen. Tør og frisk.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">318,-</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Sauvignon Blanc Stables, New Zealand</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Lys citrongul farve med grønne reflekser. Duften er hyldeblomst med noter af tropiske frugter samt
                              stikkelsbær og citrus. Smagen er lang og vedholdende, med citrus og fuldmodne tropiske frugter i
                              eftersmagen. Tør men dejlig afrundet.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">358,-</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Orange Gold Gerard Bertrand, Frankrig</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Vinen en smuk gylden ravfarve. Duften er intens og kompleks med en eksplosion af blomsternøter,
                              kandiserede frugter og hvid peber. Smagen er fyldig og frisk med en aroma af eksotiske frugter.
                              Dejlig fyldig med sødmefyldte toner.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">388,-</span>
                        </div>
                      </div>
                    </div>
        
                    
        {/* Rosévin Section */}
                    <div className="border border-white/15 p-6 md:p-8">
                      <h3 className="ji-display text-2xl text-gold mb-6 pb-3 border-b border-white/15">Rosévin</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Hunter's Creek Shiraz Rosé, Australien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Smagen er dejlig frugtrig med noter af modne sommer bær som f.eks. jordbær og hindbær, med en fint
                              afstemt krydret eftersmag. Frisk, dejlig afrundet og halvtør.
                            </p>
                            <div className="flex gap-8 mt-2">
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Glas <span className="text-gold">65,-</span>
                              </span>
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Flaske <span className="text-gold">258,-</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Domaine Houchart Côtes de Provence, Frankrig</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Domaine Houchart Rosé er flot, klar i farven. Har en lækker bouquet med fine frugtnuancer. Den er
                              frisk, let tør i smagen og bør nydes afkølet. Tør og afrundet.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">318,-</span>
                        </div>
                      </div>
                    </div>
        
                    
        {/* Rødvin Section */}
                    <div className="border border-white/15 p-6 md:p-8">
                      <h3 className="ji-display text-2xl text-gold mb-6 pb-3 border-b border-white/15">Rødvin</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Hunter's Creek Shiraz/Cabernet Sauvignon, Australien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Smagen er dejlig frugtrig med noter af modne sommer bær som f.eks. jordbær og hindbær, med en fint
                              afstemt krydret eftersmag. Fyldig og dejlig afrundet.
                            </p>
                            <div className="flex gap-8 mt-2">
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Glas <span className="text-gold">65,-</span>
                              </span>
                              <span className="ji-body text-[15px] leading-[1.75] text-white/65">
                                Flaske <span className="text-gold">258,-</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Montepulciano D'Abruzzo Il Faggio, Italien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Duft af modne frugter, blommer, kirsebær og strejf af mokka. Smagen er blød og fyldig og ledsages
                              af bløde, modne tanniner. Eftersmagen er dejlig frugtrig og afrundet.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">278,-</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Zin-Phomaniac Lodi Zinfandel - Old Vine, Californien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              En kompleks og fyldig vin med saftig, ligefrem smag af modne blå-lilla frugter og mørk halvsød
                              chokolade. Et kys af vanilje og et strejf af brunt bagekrydderi tilføjer dybde. En lang og blød
                              eftersmag.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">398,-</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="ji-body text-[17px] text-white">Monte Zovo Amarone, Italien</h4>
                            <p className="ji-body text-[14px] leading-[1.7] text-white/60 mt-1">
                              Aromaer af modne blommer og sorte kirsebær, krydderier, vanille, lakrids og chokolade. Intens
                              varme og godt integrerede tanniner i perfekt afbalanceret samspil med noter af vanille og
                              chokolade. Meget fyldig og koncentreret.
                            </p>
                          </div>
                          <span className="ji-display text-lg text-gold ml-5 whitespace-nowrap tabular-nums">618,-</span>
                        </div>
                      </div>
                    </div>
        
                    
          </div>

          <div className="border-t border-white/15 mt-14 pt-10">
            <p className="ji-body text-[16px] leading-[1.8] text-white/70">
              Øl, spiritus og sodavand står på{" "}
              <Link href="/menu" className="text-gold ji-link">drikkekortet</Link>.
              Vin serveres kun i restauranten — ikke som takeaway.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
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
        </section>
      </main>

      <Footer />
    </div>
  )
}
