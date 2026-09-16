'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Fades a section up as it enters the viewport.
 *
 * The hidden state is applied on mount, not in the server HTML — so if JS
 * never runs, or an observer isn't available, the content simply renders and
 * nothing is stranded invisible. It also unobserves after firing, because a
 * section that re-hides when you scroll back up is a distraction, not an effect.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  /** Stagger in ms, for a few siblings revealing in sequence. */
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'figure'
}) {
  const ref = useRef<HTMLElement>(null)
  const [armed, setArmed] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    // Anything already on screen at mount should not fade — it would flash.
    const node = ref.current
    if (node) {
      const box = node.getBoundingClientRect()
      if (box.top < window.innerHeight * 0.92) {
        setShown(true)
        setArmed(true)
        return
      }
    }
    setArmed(true)
  }, [])

  useEffect(() => {
    if (!armed || shown) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [armed, shown])

  return (
    <Tag
      ref={ref as never}
      className={`${armed ? 'ji-reveal' : ''} ${shown ? 'is-in' : ''} ${className}`}
      style={delay && !shown ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
