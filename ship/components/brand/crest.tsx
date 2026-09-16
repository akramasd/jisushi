import FishMark from '@/components/fish-mark'

/**
 * Patterned crest (item C) — the mark inside a ring, with a wave bed beneath.
 * Used where a single small brand token is needed: section openers, the
 * lightbox, list bullets.
 */
export default function Crest({
  className = '',
  ground = 'var(--ji-sumi)',
}: {
  className?: string
  ground?: string
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill={ground} stroke="currentColor" strokeWidth="1.6" />
      {/* wave bed */}
      <g stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.55">
        <clipPath id="crest-clip">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
        <g clipPath="url(#crest-clip)">
          {[70, 82, 94].map((y) => (
            <g key={y}>
              {[-10, 14, 38, 62, 86].map((x) => (
                <path key={x} d={`M ${x} ${y} A 12 12 0 0 1 ${x + 24} ${y}`} />
              ))}
            </g>
          ))}
        </g>
      </g>
      {/* the mark, sized to sit above the waves */}
      <g transform="translate(20 36) scale(0.0616)">
        <g fill="none" stroke="currentColor" strokeWidth="46" strokeLinecap="round">
          <path d="M20 17 C70 90 120 155 168 225 C260 320 400 400 560 410 C720 400 860 330 954 225" />
          <path d="M20 440 C70 370 120 300 168 225 C260 130 400 50 560 40 C720 50 860 120 954 225" />
        </g>
        <circle cx="831" cy="224.5" r="42" fill="currentColor" />
      </g>
    </svg>
  )
}
