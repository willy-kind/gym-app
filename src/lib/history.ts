/** Pure helpers for the History screens. */

export interface SetLike {
  exerciseId: number
  weight: number
  reps: number
  isWarmup: boolean
}

export interface SessionStats {
  workingSets: number
  exercises: number
  /** Sum of weight × reps over working sets, in kg. Bodyweight sets (0) add nothing. */
  volume: number
}

export function sessionStats(sets: readonly SetLike[]): SessionStats {
  const working = sets.filter((s) => !s.isWarmup)
  return {
    workingSets: working.length,
    exercises: new Set(sets.map((s) => s.exerciseId)).size,
    volume: Math.round(working.reduce((sum, s) => sum + s.weight * s.reps, 0) * 100) / 100,
  }
}

export interface MonthGroup<T> {
  key: string
  label: string
  items: T[]
}

/** Groups items (already sorted newest first) by calendar month, keeping their order. */
export function groupByMonth<T>(items: readonly T[], timeOf: (item: T) => number): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = []
  for (const item of items) {
    const d = new Date(timeOf(item))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    let g = groups.at(-1)
    if (g?.key !== key) {
      g = { key, label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), items: [] }
      groups.push(g)
    }
    g.items.push(item)
  }
  return groups
}

/** Timestamp → value for <input type="datetime-local"> in local time, e.g. "2026-11-09T18:05". */
export function toDateTimeLocal(timestamp: number): string {
  const d = new Date(timestamp)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Value from <input type="datetime-local"> → timestamp (local time), or null if invalid. */
export function fromDateTimeLocal(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!m) return null
  const [y, mo, d, h, mi, s] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x))) as number[]
  const date = new Date(y!, mo! - 1, d!, h!, mi!, s!)
  // Reject impossible dates like 31 Feb, which Date would silently roll over.
  if (date.getMonth() !== mo! - 1 || date.getDate() !== d) return null
  return date.getTime()
}

export const MAX_SESSION_HOURS = 12

/** Checks edited session times. Returns an error message, or null if fine. */
export function validateSessionTimes(startedAt: number | null, finishedAt: number | null, now: number): string | null {
  if (startedAt === null) return 'Enter a valid start time.'
  if (finishedAt === null) return 'Enter a valid finish time.'
  if (finishedAt < startedAt) return 'Finish must be after start.'
  if (finishedAt - startedAt > MAX_SESSION_HOURS * 3600_000) return `A workout can’t be longer than ${MAX_SESSION_HOURS} hours.`
  if (startedAt > now) return 'Start can’t be in the future.'
  return null
}
