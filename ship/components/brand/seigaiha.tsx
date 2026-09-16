/**
 * Seigaiha — the Japanese wave-scale pattern from the brand sheet.
 *
 * Construction: circles on a brick lattice, spacing D horizontally, rows every
 * D/2 with alternate rows shifted D/2. That makes the artwork periodic in both
 * axes with period exactly D, so a D×D tile repeats without a seam.
 *
 * Each scale paints an opaque disc in the ground colour before its rings, and
 * rows are emitted top-to-bottom. The later (lower) row therefore occludes the
 * bottom of the one above, which is what turns plain circles into nested fans.
 * Draw them in any other order and you get a lattice of crossing arcs instead.
 *
 * Neighbouring rows and columns outside the tile are drawn too and clipped by
 * <pattern> — without them the occlusion would be wrong at the tile edges.
 */
export default function Seigaiha({
  className = '',
  ground,
  size = 64,
  opacity = 0.14,
  strokeWidth = 1.1,
}: {
  className?: string
  /** Solid colour painted behind each scale — must match the section background. */
  ground: string
  size?: number
  opacity?: number
  strokeWidth?: number
}) {
  // Deterministic: same props = same artwork = safe to share one id.
  const id = `${size}-${String(opacity).replace('.', '')}-${ground.replace(/[^a-zA-Z0-9]/g, '')}`
  const D = size
  const R = D / 2
  const RINGS = [1, 0.72, 0.46, 0.2]

  const scales: { cx: number; cy: number }[] = []
  for (let row = -3; row <= 4; row++) {
    const cy = (row * D) / 2
    const xoff = Math.abs(row % 2) === 1 ? D / 2 : 0
    for (let m = -2; m <= 3; m++) scales.push({ cx: m * D + xoff, cy })
  }
  scales.sort((a, b) => a.cy - b.cy)

  return (
    <svg
      aria-hidden="true"
      className={className}
      width="100%"
      height="100%"
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={`seigaiha-${id}`} width={D} height={D} patternUnits="userSpaceOnUse">
          {scales.map((s, i) => (
            <g key={i}>
              <circle cx={s.cx} cy={s.cy} r={R} fill={ground} />
              {RINGS.map((k) => (
                <circle
                  key={k}
                  cx={s.cx}
                  cy={s.cy}
                  r={R * k}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                />
              ))}
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#seigaiha-${id})`} />
    </svg>
  )
}
