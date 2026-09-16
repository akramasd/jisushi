import type { Metadata } from "next"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import Seigaiha from "@/components/brand/seigaiha"
import WaveDivider from "@/components/brand/wave-divider"
import OrderClient from "./order-client"
import { supabase, serviceClient, type MenuItem } from "@/lib/supabase"
import { getOpenState } from "@/lib/opening-hours"
import { SITE } from "@/lib/site"
import fallbackMenu from "@/data/menu-fallback.json"

export const metadata: Metadata = {
  title: "Takeaway",
  description:
    "Bestil sushi til afhentning hos Ji Sushi i Frederikshavn. Vælg fra hele menukortet og betal ved afhentning.",
  alternates: { canonical: "/takeaway" },
}

// Prices change in the kitchen, so never serve a stale menu for long.
export const revalidate = 60

export default async function TakeawayPage() {
  // Always start with the bundled last-known-good menu.
  // Supabase may replace it with fresher data below.
  let items: MenuItem[] = fallbackMenu as MenuItem[]
  let dbError = false

  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,name,description,price,category,is_available,sort_order,allergens,allergens_reviewed,allergen_note,allergen_confidence")
      // NOT .order("id") — id is a random UUID, which listed the menu in an
      // arbitrary sequence that matched neither the paper menu nor itself.
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
    if (error || !data || data.length === 0) {
      dbError = true
    } else {
      items = data as MenuItem[]
    }
  } catch {
    dbError = true
  }

  // The owner's manual pause. Read server-side with the service role, because
  // anon can select menu_items and nothing else.
  //
  // Shown BEFORE the menu rather than at checkout: letting someone build a cart
  // and then telling them at the last step is the most annoying possible way to
  // deliver this news.
  let paused: { on: boolean; message: string | null } = { on: false, message: null }
  try {
    const { data: trading } = await serviceClient()
      .from("settings")
      .select("ordering_paused,pause_message")
      .eq("id", "main")
      .maybeSingle()
    if (trading?.ordering_paused) {
      paused = { on: true, message: trading.pause_message ?? null }
    }
  } catch {
    // If this cannot be read, take orders. A pause that fails open costs a
    // busy evening; one that fails closed costs every evening.
  }

  // Category order is derived from where each category first appears in the
  // menu's own sequence. A hardcoded list here would need editing every time a
  // category is added — and would be wrong for the next restaurant entirely.
  const firstSeen = new Map<string, number>()
  for (const i of items) {
    if (!firstSeen.has(i.category)) firstSeen.set(i.category, firstSeen.size)
  }
  const categories = Array.from(firstSeen.keys())
  const open = getOpenState()

  return (
    <div className="min-h-screen bg-sumi text-white flex flex-col">
      <AnimatedHeader />

      <main id="indhold" className="flex-1">
        <section className="relative overflow-hidden border-b border-white/10">
          <div aria-hidden="true" className="absolute inset-0 text-gold pointer-events-none">
            <Seigaiha ground="#0E0F11" opacity={0.09} size={84} />
          </div>
          <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12">
            <div className="flex items-baseline justify-between gap-6">
              <p className="ji-eyebrow text-white/70">Takeaway</p>
              <p aria-hidden="true" className="ji-kanji text-sm text-white/60">お持ち帰り</p>
            </div>
            <h1 className="ji-display text-[clamp(2.4rem,7vw,4.4rem)] leading-[1.06] mt-4">
              Bestil online
            </h1>
            <div aria-hidden="true" className="my-8 max-w-[13rem] text-gold">
              <WaveDivider height={11} rows={2} />
            </div>
            <p className="ji-body text-[18px] leading-[1.85] text-white/75 max-w-xl">
              Vælg fra hele menukortet. Du betaler ved afhentning — kontant eller kort i butikken.
            </p>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="max-w-6xl mx-auto px-6 py-20 text-center">
            <p className="ji-body text-[18px] text-white/75 max-w-md mx-auto leading-[1.85]">
              Menuen kunne ikke hentes lige nu. Ring til os på{" "}
              <a href={SITE.phoneHref} className="text-gold ji-link">{SITE.phoneDisplay}</a>, så tager vi
              din bestilling over telefonen.
            </p>
          </section>
        ) : (
          <OrderClient items={items} categories={categories} openState={open} paused={paused} />
        )}
      </main>

      <Footer />
    </div>
  )
}
