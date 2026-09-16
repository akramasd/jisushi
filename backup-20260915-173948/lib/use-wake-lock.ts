'use client'
import { useEffect } from 'react'

/**
 * Keeps the kitchen screen awake.
 *
 * An iPad on the pass locks its screen after a few minutes. iOS then suspends
 * the tab's timers, so polling stops — and the failure is silent: the screen
 * looks exactly like a quiet evening. The kitchen finds out when a customer
 * arrives asking about an order nobody saw.
 *
 * The lock is dropped by the browser whenever the tab is hidden, so it has to
 * be re-acquired on every return to visibility rather than taken once.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        lock = await (navigator as Navigator & {
          wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinel> }
        }).wakeLock.request('screen')
      } catch {
        // Denied, unsupported, or battery saver. The chime still fires.
      }
    }

    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [active])
}
