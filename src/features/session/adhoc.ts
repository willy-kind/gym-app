// Exercises added during a session but not logged yet have no table of their own,
// so the list is kept on the device. Losing it loses no sets: they just need re-adding.
const key = (sessionId: number) => `gym.session.${sessionId}.adhoc`

export function loadAdhoc(sessionId: number): number[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key(sessionId)) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : []
  } catch {
    return []
  }
}

export function saveAdhoc(sessionId: number, ids: number[]): void {
  try {
    localStorage.setItem(key(sessionId), JSON.stringify(ids))
  } catch {
    // Storage unavailable: the list just won't survive a restart.
  }
}

export function clearAdhoc(sessionId: number): void {
  try {
    localStorage.removeItem(key(sessionId))
  } catch {
    // ignore
  }
}
