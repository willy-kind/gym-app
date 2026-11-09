import { useSyncExternalStore } from 'react'
import { parseSettings, type Settings } from '../../lib/settings'

const KEY = 'gym.settings'

function load(): Settings {
  try {
    return parseSettings(localStorage.getItem(KEY))
  } catch {
    return parseSettings(null)
  }
}

let current: Settings = load()
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return current
}

export function updateSettings(changes: Partial<Settings>): void {
  current = { ...current, ...changes }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Storage unavailable: settings last until the app is closed.
  }
  for (const l of listeners) l()
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => current,
  )
}
