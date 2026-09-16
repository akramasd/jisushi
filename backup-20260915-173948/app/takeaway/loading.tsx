/**
 * Skeleton shaped like the menu it replaces.
 *
 * A spinner tells you to wait. A skeleton in the right shape tells you what is
 * coming, so the page does not appear to jump when it arrives. Marked
 * aria-hidden with a single live-region label: a screen reader should hear
 * "loading", not eleven empty list items.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-sumi text-white">
      <p className="sr-only" role="status">
        Henter menuen…
      </p>
      <div className="max-w-6xl mx-auto px-6 py-16" aria-hidden="true">
        <div className="h-3 w-28 bg-white/10 mb-6" />
        <div className="h-10 w-2/3 max-w-md bg-white/10 mb-12" />

        <div className="flex gap-3 mb-12 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 shrink-0 bg-white/[0.07]" />
          ))}
        </div>

        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-6 py-5 border-b border-white/10">
            <div className="flex-1">
              <div className="h-4 w-1/3 bg-white/10 mb-3" />
              <div className="h-3 w-2/3 bg-white/[0.06]" />
            </div>
            <div className="h-4 w-14 bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
