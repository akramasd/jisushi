import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"

export default function OmOsPage() {
  return (
    <div className="min-h-screen bg-sumi text-white flex flex-col">
      <AnimatedHeader />

      <main className="flex-1">
        <section className="relative h-[300px] flex items-center justify-center bg-gradient-to-b from-slate-ink to-sumi">
          <div className="text-center">
            <h1 className="ji-display text-[clamp(2.2rem,6.5vw,3.6rem)] mb-4">
              <span className="text-gold">Ji Sushi</span> Frederikshavn
            </h1>
            <p className="ji-body text-[17px] leading-[1.85] text-white/75">Frisklavet sushi af de bedste råvarer</p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="bg-slate-ink p-8 md:p-12 mb-12">
            <p className="ji-body text-[17px] leading-[1.85] text-white/75 mb-6">
              <span className="text-gold">Ji Sushi Frederikshavn</span> er en moderne japansk
              sushi-restaurant, hvor kvalitet, friskhed og gode råvarer er i centrum. Vi bruger udelukkende nøje
              udvalgte råvarer, og al sushi bliver frisklavet ved bestilling, så du altid får den bedste smagsoplevelse.
            </p>
            <p className="ji-body text-[17px] leading-[1.85] text-white/75 mb-6">
              Vi tilbyder Sushi Ad Libitum (All You Can Eat) i Frederikshavn, hvor du kan bestille flere gange og nyde
              et stort udvalg af sushi og japanske retter. På menuen finder du blandt andet nigiri, maki, uramaki og
              specialruller samt varme retter og sticks – perfekt til både sushi-elskere og dem, der ønsker variation.
            </p>
            <p className="ji-body text-[17px] leading-[1.85] text-white/75 mb-6">
              Hos <span className="text-gold">Ji Sushi</span> lægger vi vægt på en hyggelig atmosfære og venlig service,
              hvor både familier, par og vennegrupper føler sig velkomne. Restauranten tilbyder både spisning i
              restauranten og takeaway, og børn kan spise til børnepris.
            </p>
            <p className="ji-body text-[17px] leading-[1.85] text-white/75">
              Uanset om du leder efter all you can eat sushi i Frederikshavn, frisklavet sushi eller en afslappet
              japansk restaurantoplevelse, er <span className="text-gold">Ji Sushi</span> et oplagt valg.
            </p>
          </div>

          <div className="text-center">
            <p className="ji-display text-gold text-2xl">
              Velkommen hos <span className="text-gold">Ji Sushi</span> Frederikshavn – sushi lavet med omtanke og de
              bedste råvarer.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
