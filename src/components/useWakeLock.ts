import { useEffect } from 'react'

/** Whether this browser can keep the screen awake (Screen Wake Lock API). */
export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

/**
 * Keeps the screen on while `enabled` and the app is visible. iOS drops the lock
 * whenever the app is hidden (other app, phone locked), so it's asked for again
 * each time the app comes back. If a request is refused (e.g. before any tap),
 * the next tap tries again.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !wakeLockSupported) return
    let lock: WakeLockSentinel | null = null
    let stopped = false

    const acquire = async () => {
      if (stopped || document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (stopped) void lock.release()
      } catch {
        // Refused (not visible, low battery mode, no user gesture yet): retried on the next tap.
      }
    }
    const onVisible = () => void acquire()
    const onTap = () => void acquire()

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('pointerdown', onTap)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('pointerdown', onTap)
      if (lock && !lock.released) void lock.release()
    }
  }, [enabled])
}
