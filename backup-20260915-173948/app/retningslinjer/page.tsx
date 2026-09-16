import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"

export default function RetningslinjerPage() {
  return (
    <div className="min-h-screen bg-sumi text-white">
      <AnimatedHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="ji-display text-[clamp(2.2rem,6.5vw,3.6rem)] mb-4 text-white">Retningslinjer</h1>
          <p className="text-xl text-gold">All You Can Eat koncept</p>
          <p className="text-lg text-muted-ink mt-2">hos Ji Sushi Frederikshavn</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-slate-ink p-8 md:p-12 space-y-8">
          <p className="ji-body text-[17px] leading-[1.85] text-white/75">
            For at sikre en god og fair oplevelse for alle gæster beder vi venligst om, at følgende retningslinjer
            overholdes:
          </p>

          {/* New Guidelines Section */}
          <div className="space-y-3">
            <h2 className="ji-display text-[clamp(1.5rem,3.5vw,2.1rem)] text-gold">Vores All You Can Eat-koncept</h2>
            <ul className="space-y-2 ji-body text-[16px] leading-[1.8] text-white/70 list-disc list-inside">
              <li>Vores All You Can Eat-koncept gælder pr. person</li>
              <li>Alle, der spiser, skal bestille og betale hver for sig</li>
              <li>Det er ikke tilladt at dele retter eller spise flere personer på én All You Can Eat-bestilling</li>
              <li>Smagsprøver tilbydes ikke</li>
            </ul>
          </div>

          {/* All You Can Eat – fælles for hele bordet */}
          <div className="space-y-3">
            <h2 className="ji-display text-[clamp(1.5rem,3.5vw,2.1rem)] text-gold">All You Can Eat – fælles for hele bordet</h2>
            <p className="ji-body text-[16px] leading-[1.8] text-white/70">
              All You Can Eat gælder for hele bordet, hvilket betyder, at alle gæster ved samme bord skal vælge det
              samme koncept.
            </p>
          </div>

          {/* Madspild */}
          <div className="space-y-3">
            <h2 className="ji-display text-[clamp(1.5rem,3.5vw,2.1rem)] text-gold">Madspild</h2>
            <p className="ji-body text-[16px] leading-[1.8] text-white/70">
              Vi opfordrer til at bestille mindre portioner ad gangen og bestille flere gange efter behov.
            </p>
            <p className="ji-body text-[16px] leading-[1.8] text-white/70">
              Ved madspild på mere end 3 stk. sushi opkræves der{" "}
              <span className="text-white font-medium">10 kr. pr. stk.</span>
            </p>
          </div>

          {/* Drikkevarer */}
          <div className="space-y-3">
            <h2 className="ji-display text-[clamp(1.5rem,3.5vw,2.1rem)] text-gold">Drikkevarer</h2>
            <p className="ji-body text-[16px] leading-[1.8] text-white/70">
              Ved vores All You Can Eat-koncept forventes det, at der bestilles drikkevarer pr. person.
            </p>
          </div>

          {/* Closing */}
          <div className="pt-6 border-t border-[#5A6167] space-y-3">
            <p className="ji-body text-[16px] leading-[1.8] text-white/70">
              Tak for jeres forståelse og for at hjælpe os med at sikre kvalitet, friskhed og mindre madspild.
            </p>
            <p className="text-white text-lg">Vi ønsker jer en rigtig god spiseoplevelse.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
