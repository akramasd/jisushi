/**
 * Wave divider — item L on the brand sheet, "a use as dividers on the website".
 *
 * The same seigaiha geometry reduced to a single row of top arcs, so the
 * divider is visibly part of the pattern system rather than a separate motif.
 * Repeats horizontally at any width via patternUnits.
 */
export default function WaveDivider({
  className = '',
  height = 14,
  strokeWidth = 1,
  rows = 2,
}: {
  className?: string
  height?: number
  strokeWidth?: number
  /** 1 = a single scallop line, 2 = the layered version from the sheet. */
  rows?: 1 | 2
}) {
  const R = height
  const arc = (r: number, dy: number) =>
    `M ${-R} ${R + dy} A ${r} ${r} 0 0 1 ${R} ${R + dy}`

  return (
    <svg
      aria-hidden="true"
      className={className}
      width="100%"
      height={height * (rows === 2 ? 1.9 : 1.15)}
      viewBox={`0 0 ${R * 2} ${R * (rows === 2 ? 1.9 : 1.15)}`}
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    >
      <defs>
        <pattern id="wave" width={R * 2} height={R * 2} patternUnits="userSpaceOnUse">
          <path d={arc(R, 0)} />
          <path d={arc(R * 0.62, 0)} />
          {rows === 2 && (
            <g transform={`translate(${R} ${R * 0.85})`}>
              <path d={arc(R, 0)} opacity="0.55" />
              <path d={arc(R * 0.62, 0)} opacity="0.55" />
            </g>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wave)" stroke="none" />
    </svg>
  )
}
