import { useSyncExternalStore } from 'react'
import { adjustRestTimer, createRestTimer, parseRestTimer, type RestTimer } from '../../lib/restTimer'

// The running rest timer, shared by every screen and kept on the device so a
// restarted app picks it up again. It's UI state, not workout data, so it
// lives outside IndexedDB.
const KEY = 'gym.restTimer'

function load(): RestTimer | null {
  try {
    return parseRestTimer(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

let current: RestTimer | null = load()
const listeners = new Set<() => void>()

function set(timer: RestTimer | null) {
  current = timer
  try {
    if (timer) localStorage.setItem(KEY, JSON.stringify(timer))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable: the timer still works until the app is closed.
  }
  for (const l of listeners) l()
}

export function startRest(seconds: number, meta: { sessionId: number; exerciseName: string }, now = Date.now()) {
  set(createRestTimer(seconds, now, meta))
}

export function adjustRest(deltaSeconds: number, now = Date.now()) {
  if (current) set(adjustRestTimer(current, deltaSeconds, now))
}

export function clearRest() {
  if (current) set(null)
}

export function useRestTimer(): RestTimer | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => current,
  )
}
