'use client'
import { useId } from 'react'

/**
 * The Ji Sushi mark, traced from the original hand-drawn logo.
 *
 * Two strokes, each a single gesture: one starts at the upper tail tip,
 * descends, crosses its twin, and becomes the belly; the other mirrors it
 * and becomes the back. They meet at the nose. The crossing is the tail —
 * it is why the mark reads as one continuous movement of the brush.
 *
 * Geometry is measured from the source PNG (stroke width, tail tips, the
 * peak of the back, the eye) rather than approximated, so this scales
 * cleanly anywhere the raster logo would go soft.
 */
export default function FishMark({
  className = '',
  strokeWidth = 16,
  draw = false,
  title,
}: {
  className?: string
  strokeWidth?: number
  /** Animate the strokes as if brushed on. */
  draw?: boolean
  /** Accessible name; omit to mark it decorative. */
  title?: string
}) {
  const id = useId()

  return (
    <svg
      viewBox="0 0 974 460"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? `${id}-t` : undefined}
    >
      {title && <title id={`${id}-t`}>{title}</title>}

      {/* Upper tail tip → crossing → belly → nose */}
      <path
        className={draw ? 'ink-stroke ink-stroke-1' : undefined}
        pathLength={1}
        d="M20 17 C70 90 120 155 168 225 C260 320 400 400 560 410 C720 400 860 330 954 225"
      />
      {/* Lower tail tip → crossing → back → nose */}
      <path
        className={draw ? 'ink-stroke ink-stroke-2' : undefined}
        pathLength={1}
        d="M20 440 C70 370 120 300 168 225 C260 130 400 50 560 40 C720 50 860 120 954 225"
      />
      {/* The eye lands last, the way it does when you draw one */}
      <circle
        className={draw ? 'ink-dot' : undefined}
        cx="831"
        cy="224.5"
        r="16"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}
