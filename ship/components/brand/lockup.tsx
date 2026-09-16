import FishMark from "@/components/fish-mark"
import { SITE } from "@/lib/site"

/**
 * The two approved lockups from the brand sheet (D and E).
 * "SINCE ####" reads from SITE.founded so the header, footer and about page
 * can never disagree about the year.
 */
export function LockupVertical({
  className = "",
  markClass = "w-24 h-12",
  draw = false,
  align = "center",
}: {
  className?: string
  markClass?: string
  draw?: boolean
  /** Explicit prop, not a class override: Tailwind resolves conflicting
      utilities by its own output order, so `items-start` passed via className
      would silently lose to `items-center`. */
  align?: "center" | "start"
}) {
  const alignment = align === "start" ? "items-start text-left" : "items-center text-center"
  return (
    <div className={`flex flex-col ${alignment} ${className}`}>
      <FishMark draw={draw} title="Ji Sushi" className={markClass} strokeWidth={14} />
      <span className="ji-display block mt-5 text-[clamp(1.1rem,2.4vw,1.6rem)] tracking-[0.34em] leading-none pl-[0.34em]">
        JI SUSHI
      </span>
      <span className="ji-accent block mt-3 text-[9px] tracking-[0.42em] opacity-70 pl-[0.42em]">
        SINCE {SITE.founded}
      </span>
    </div>
  )
}

export function LockupHorizontal({
  className = "",
  markClass = "w-14 h-7",
}: {
  className?: string
  markClass?: string
}) {
  return (
    <span className={`inline-flex items-center gap-4 ${className}`}>
      <FishMark className={markClass} strokeWidth={18} />
      <span className="flex flex-col leading-none">
        <span className="ji-display text-[15px] sm:text-[17px] tracking-[0.3em] pl-[0.3em]">JI SUSHI</span>
        <span className="ji-accent mt-1.5 text-[8px] tracking-[0.38em] opacity-60 pl-[0.38em]">
          SINCE {SITE.founded}
        </span>
      </span>
    </span>
  )
}
