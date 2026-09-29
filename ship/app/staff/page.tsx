import { redirect } from "next/navigation"
import { isDemoMode, isDemoLiveWrites } from "@/lib/demo"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import StaffLookup from "./lookup-client"

const DEMO_ORDERS = [
  {
    no: 9001,
    customer: "Demo Demoesen",
    items: "2× California (8 stk.), 1× Edamame",
    total: 203,
    status: "pending_owner_confirmation",
    pickup: "30 min",
  },
  {
    no: 9002,
    customer: "Demo Gæst",
    items: "1× Sushi Box (20 stk.)",
    total: 249,
    status: "preparing",
    pickup: "45 min",
  },
];

const DEMO_RESERVATIONS = [
  {
    no: 7001,
    customer: "Demo Demoesen",
    when: "I morgen kl. 18:00",
    guests: 2,
    status: "pending_owner_confirmation",
  },
];

const STEPS = ["Modtaget", "Bekræftet", "Tilberedes", "Klar", "Afhentet"];

export default function StaffPage() {
  // Med ejerens live-writes flag er ordrerne rigtige, så personalet skal ind
  // på den rigtige portal — præcis som production.
  if (isDemoMode() && !isDemoLiveWrites()) {
    return (
      <div className="min-h-screen bg-sumi text-white flex flex-col">
        <AnimatedHeader />
        <main id="indhold" className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
          <p
            role="note"
            className="inline-block border border-gold/60 px-4 py-2 ji-accent text-[12px] tracking-[0.2em] uppercase text-gold"
          >
            Demo — read-only, ingen live data
          </p>
          <h1 className="ji-display text-[clamp(2rem,6vw,3rem)] mt-6">
            Personale (demo)
          </h1>
          <p className="ji-body text-[16px] text-white/70 mt-4 leading-[1.8] max-w-xl">
            Dette er et mock-dashboard. Det viser eksempelordrer og status-
            progression uden at læse eller skrive til live Supabase, Sheets,
            SMS eller notifikationer. I production redirecter /staff til live
            staff-portal.
          </p>

          <section aria-label="Demoordrer" className="mt-12">
            <h2 className="ji-eyebrow text-white/70 mb-4">
              Eksempelordrer
            </h2>
            <ul className="border border-white/15 divide-y divide-white/10">
              {DEMO_ORDERS.map((o) => (
                <li key={o.no} className="p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="ji-display text-xl">Ordre #{o.no}</p>
                    <p className="ji-accent text-[12px] uppercase tracking-[0.15em] text-gold">
                      {o.status}
                    </p>
                  </div>
                  <p className="ji-body text-[15px] text-white/70 mt-2">
                    {o.customer} · {o.items} · {o.total} kr · afhentning om{" "}
                    {o.pickup}
                  </p>
                  <ol
                    className="flex items-start gap-2 mt-4"
                    aria-label={`Status for ordre ${o.no}`}
                  >
                    {STEPS.map((s, i) => (
                      <li key={s} className="flex-1">
                        <div
                          className={`h-1 ${i <= 1 ? "bg-gold" : "bg-white/15"}`}
                        />
                        <span className="ji-accent text-[10px] uppercase mt-2 block text-white/50">
                          {s}
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Demoreservationer" className="mt-10">
            <h2 className="ji-eyebrow text-white/70 mb-4">
              Eksempelreservationer
            </h2>
            <ul className="border border-white/15 divide-y divide-white/10">
              {DEMO_RESERVATIONS.map((r) => (
                <li key={r.no} className="p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="ji-display text-xl">
                      Reservation #{r.no}
                    </p>
                    <p className="ji-accent text-[12px] uppercase tracking-[0.15em] text-gold">
                      {r.status}
                    </p>
                  </div>
                  <p className="ji-body text-[15px] text-white/70 mt-2">
                    {r.customer} · {r.when} · {r.guests} gæster
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <p className="ji-body text-[14px] text-white/55 mt-10 leading-[1.8]">
            Skrivehandlinger er deaktiveret i demo. Alle kitchen/admin/write-
            endpoints svarer 403 demo_mode_read_only.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // Med ejerens live-writes flag er ordrerne rigtige: vis et præsentabelt
  // ejer-dashboard med live ordreopslag i stedet for en nøgen redirect.
  if (isDemoMode() && isDemoLiveWrites()) {
    return (
      <div className="min-h-screen bg-sumi text-white flex flex-col">
        <AnimatedHeader />
        <main id="indhold" className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
          <p
            role="note"
            className="inline-block border border-gold/60 px-4 py-2 ji-accent text-[12px] tracking-[0.2em] uppercase text-gold"
          >
            Demo-preview — live data
          </p>
          <h1 className="ji-display text-[clamp(2rem,6vw,3rem)] mt-6">
            Personale
          </h1>
          <p className="ji-body text-[16px] text-white/70 mt-4 leading-[1.8] max-w-xl">
            Ejerside for Ji Sushi. Opslag nedenfor læser live-status direkte
            fra databasen — ordrer bekræftes i staff-portalen.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-3">
            <a
              href="https://bczgdophgxjltnpzmkic.supabase.co/functions/v1/staff-portal"
              className="ji-accent text-[13px] tracking-[0.18em] uppercase bg-gold text-sumi px-6 py-4 text-center"
            >
              Åbn køkkenportal
            </a>
            <a
              href="/takeaway"
              className="ji-accent text-[13px] tracking-[0.18em] uppercase border border-white/30 px-6 py-4 text-center hover:border-gold hover:text-gold transition-colors"
            >
              Takeaway
            </a>
            <a
              href="/booking"
              className="ji-accent text-[13px] tracking-[0.18em] uppercase border border-white/30 px-6 py-4 text-center hover:border-gold hover:text-gold transition-colors"
            >
              Booking
            </a>
          </div>

          <div className="mt-8">
            <StaffLookup />
          </div>

          <p className="ji-body text-[14px] text-white/55 mt-10 leading-[1.8]">
            Tip: ordrens token står på kvitteringens “Følg din
            bestilling”-link. Booking- og køkkenhandlinger foregår i
            køkkenportalen.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  redirect(
    "https://bczgdophgxjltnpzmkic.supabase.co/functions/v1/staff-portal",
  );
}
