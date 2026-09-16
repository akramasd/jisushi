import type { Metadata } from "next"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import { SITE, COMPANY } from "@/lib/site"

export const metadata: Metadata = {
  title: "Privatlivspolitik",
  description: "Sådan behandler Ji Sushi dine oplysninger, når du bestiller takeaway.",
}

/**
 * GDPR Article 13 notice.
 *
 * Written plainly rather than in legalese, because the point is that a customer
 * understands it. The retention answer is unusually good here — thirty days,
 * then automatic deletion, enforced by the database — so it is stated directly.
 */
export default function Privatliv() {
  return (
    <div className="min-h-screen bg-sumi text-white flex flex-col">
      <AnimatedHeader />
      <main id="indhold" className="flex-1 max-w-2xl mx-auto px-6 py-16">
        <p className="ji-eyebrow text-white/70">Persondata</p>
        <h1 className="ji-display text-[clamp(2rem,6vw,3rem)] mt-4">Privatlivspolitik</h1>

        <div className="ji-body text-[17px] leading-[1.85] text-white/80 mt-10 space-y-10">
          <section>
            <h2 className="ji-display text-2xl text-gold mb-3">Hvad vi gemmer</h2>
            <p>
              Når du bestiller takeaway, gemmer vi dit <strong className="text-white">navn</strong>,
              dit <strong className="text-white">telefonnummer</strong> og{" "}
              <strong className="text-white">hvad du har bestilt</strong>. Det er alt.
            </p>
            <p className="mt-3">
              Vi beder ikke om din adresse, din e-mail eller din fødselsdato, og
              vi tager ikke imod betaling online — du betaler i butikken.
            </p>
          </section>

          <section>
            <h2 className="ji-display text-2xl text-gold mb-3">Hvorfor</h2>
            <p>
              Vi skal kunne lave din mad og kunne ringe til dig, hvis der er
              noget med bestillingen. Behandlingen sker for at opfylde aftalen
              med dig, jf. databeskyttelsesforordningens artikel 6, stk. 1,
              litra b.
            </p>
          </section>

          <section>
            <h2 className="ji-display text-2xl text-gold mb-3">Hvor længe</h2>
            <p>
              <strong className="text-white">30 dage.</strong> Derefter slettes
              din bestilling automatisk — det sker af sig selv hver nat, ikke
              fordi nogen husker at gøre det.
            </p>
            <p className="mt-3">
              Vi beholder ordrerne i 30 dage, så køkkenet kan finde din
              bestilling, hvis der opstår tvivl om noget. Længere har vi ikke
              brug for dem.
            </p>
          </section>

          <section>
            <h2 className="ji-display text-2xl text-gold mb-3">Hvem ser dem</h2>
            <p>
              Kun personalet i restauranten. Køkkenskærmen kræver login.
            </p>
            <p className="mt-3">
              Vi bruger disse leverandører til at drive hjemmesiden:
              <span className="block mt-2 text-white/70">
                Supabase (database, EU) · Vercel (hosting) · Cloudinary (billeder)
              </span>
            </p>
            <p className="mt-3">
              Vi sælger ikke dine oplysninger og bruger dem ikke til
              markedsføring.
            </p>
          </section>

          <section>
            <h2 className="ji-display text-2xl text-gold mb-3">Cookies</h2>
            <p>
              Hjemmesiden sætter ikke sporingscookies. Vi bruger en
              cookiefri besøgsstatistik, der ikke kan identificere dig.
            </p>
            <p className="mt-3">
              Facebook-opslag på forsiden indlæses først, når du selv trykker
              “Vis opslag”. Gør du det, sætter Facebook cookies på din enhed.
              Gør du det ikke, sker der ingenting.
            </p>
            <p className="mt-3">
              Din kurv gemmes lokalt i din egen browser, så den ikke forsvinder,
              hvis du opdaterer siden. Den sendes ikke til os, før du bestiller.
            </p>
          </section>

          <section>
            <h2 className="ji-display text-2xl text-gold mb-3">Få dine oplysninger slettet</h2>
            <p>
              Du behøver ikke vente på de 30 dage. Vil du have dit navn og
              telefonnummer slettet med det samme, så sig til — vi gør det, og du
              skal ikke begrunde hvorfor.
            </p>

            <div className="border border-white/20 px-5 py-5 mt-5">
              <p className="ji-eyebrow text-white/60 mb-3">Sådan gør du</p>
              <p className="mb-2">
                <strong className="text-white">Ring:</strong>{" "}
                <a href={SITE.phoneHref} className="text-gold ji-link">{SITE.phoneDisplay}</a>
              </p>
              <p>
                <strong className="text-white">Eller skriv:</strong>{" "}
                <a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent("Sletning af mine oplysninger")}&body=${encodeURIComponent(
                    "Hej Ji Sushi\n\nJeg vil gerne have slettet de oplysninger, I har om mig.\n\nNavn:\nTelefonnummer brugt ved bestilling:\n\nVenlig hilsen",
                  )}`}
                  className="text-gold ji-link"
                >
                  {SITE.email}
                </a>
              </p>
              <p className="text-white/60 text-[15px] mt-4 leading-[1.7]">
                Skriv det navn og telefonnummer, du bestilte med — det er dem, vi
                søger på. Vi svarer inden for en måned, og som regel samme uge.
              </p>
            </div>
          </section>

          <section>
            <h2 className="ji-display text-2xl text-gold mb-3">Dine øvrige rettigheder</h2>
            <p>
              Du kan også bede om at se, hvad vi har registreret om dig, få det
              rettet, eller gøre indsigelse mod behandlingen. Samme fremgangsmåde:
              ring eller skriv.
            </p>
            <p className="mt-3">
              Er du utilfreds med, hvordan vi behandler dine oplysninger, kan du
              klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby —{" "}
              <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="text-gold ji-link">
                datatilsynet.dk
              </a>.
            </p>
          </section>

          <section className="border-t border-white/15 pt-8">
            <h2 className="ji-display text-2xl text-gold mb-3">Dataansvarlig</h2>
            <p className="text-white/70">
              {COMPANY.legalName}<br />
              <span className="text-white/50">driver {COMPANY.tradingAs}</span><br />
              {SITE.street}, {SITE.city}<br />
              CVR {COMPANY.cvr}<br />
              Tlf. {SITE.phoneDisplay}<br />
              {SITE.email}
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
