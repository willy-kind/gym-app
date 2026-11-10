/**
 * Rest timer maths. The timer is only ever a stored end time: what's left is
 * always computed from the clock, so it stays right while iOS has the app
 * suspended in the background.
 */

export interface RestTimer {
  startedAt: number
  endsAt: number
  sessionId: number
  exerciseName: string
}

export const REST_ADJUST_SECONDS = 15
/** A finished rest shows "Go" this long, then clears itself so the next set can start; no tap needed. */
export const REST_OVER_SHOW_SECONDS = 4

export function createRestTimer(seconds: number, now: number, meta: { sessionId: number; exerciseName: string }): RestTimer {
  return { startedAt: now, endsAt: now + Math.max(0, seconds) * 1000, ...meta }
}

/**
 * +/− some seconds. Never ends before now. Adding time to a finished timer
 * restarts it from now; taking time from a finished one changes nothing.
 */
export function adjustRestTimer(timer: RestTimer, deltaSeconds: number, now: number): RestTimer {
  const base = Math.max(timer.endsAt, now)
  return { ...timer, endsAt: Math.max(now, base + deltaSeconds * 1000) }
}

/** Whole seconds left, rounded up so "0:00" only shows when time is really up. */
export function remainingSeconds(timer: RestTimer, now: number): number {
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
}

/** Whole seconds since the timer ended (0 while still running). */
export function overtimeSeconds(timer: RestTimer, now: number): number {
  return Math.max(0, Math.floor((now - timer.endsAt) / 1000))
}

export function isDone(timer: RestTimer, now: number): boolean {
  return now >= timer.endsAt
}

/** Fraction of the rest still to go, 1 → 0, for the progress bar. */
export function progress(timer: RestTimer, now: number): number {
  const total = timer.endsAt - timer.startedAt
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, (timer.endsAt - now) / total))
}

/** Reads a stored timer back, rejecting anything malformed. */
export function parseRestTimer(json: string | null): RestTimer | null {
  if (!json) return null
  try {
    const v = JSON.parse(json) as Partial<RestTimer> | null
    if (
      v &&
      typeof v.startedAt === 'number' &&
      typeof v.endsAt === 'number' &&
      typeof v.sessionId === 'number' &&
      typeof v.exerciseName === 'string' &&
      v.endsAt >= v.startedAt
    ) {
      return { startedAt: v.startedAt, endsAt: v.endsAt, sessionId: v.sessionId, exerciseName: v.exerciseName }
    }
  } catch {
    // fall through
  }
  return null
}
