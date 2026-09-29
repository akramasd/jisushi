/**
 * Synlig demo-markering så preview aldrig forveksles med live Ji Sushi.
 * Rendrer intet når NEXT_PUBLIC_PREPNEST_DEMO_MODE ikke er "1" — production
 * er dermed pixel-identisk.
 */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_PREPNEST_DEMO_MODE !== "1") return null;
  return (
    <div
      role="note"
      aria-label="Demo-version"
      className="bg-gold text-sumi text-center px-4 py-2 ji-accent text-[12px] tracking-[0.18em] uppercase"
    >
      Demo — ikke live Ji Sushi · ingen rigtige ordrer, reservationer eller
      betalinger
    </div>
  );
}
