/** Pure logic for logging a session: which exercises to show, prefills, "Last time" text, what's next. */
import { DEFAULT_TARGET_REPS, parseRepTarget } from './targets'
import { formatMass, type WeightUnit } from './units'

export interface SetValues {
  weight: number
  reps: number
}

export interface LoggedSet extends SetValues {
  id: number
  exerciseId: number
  order: number
  isWarmup: boolean
  completedAt: number
}

export interface PlanEntry {
  exerciseId: number
  name: string
  targetSets: number
  targetReps: string
  targetWeight?: number
  restSeconds: number
}

export interface SessionExercise {
  exerciseId: number
  name: string
  /** Undefined for exercises added during the session. */
  plan?: PlanEntry
  /** This session's sets for the exercise, in order. */
  sets: LoggedSet[]
  workingSets: number
  /** Planned and all target sets logged. */
  done: boolean
}

/**
 * The exercises to show in a session: the day's plan in order, then anything
 * else that has sets (by when it was first logged), then ad-hoc exercises
 * added but not logged yet. An exercise planned twice on a day is shown once.
 */
export function buildSessionExercises(
  plan: readonly PlanEntry[],
  sets: readonly LoggedSet[],
  adhoc: readonly { exerciseId: number; name: string }[],
  nameOf: (exerciseId: number) => string,
): SessionExercise[] {
  const byExercise = new Map<number, LoggedSet[]>()
  for (const s of [...sets].sort((a, b) => a.order - b.order || a.completedAt - b.completedAt)) {
    const list = byExercise.get(s.exerciseId) ?? []
    list.push(s)
    byExercise.set(s.exerciseId, list)
  }

  const seen = new Set<number>()
  const make = (exerciseId: number, name: string, entry?: PlanEntry): SessionExercise => {
    seen.add(exerciseId)
    const own = byExercise.get(exerciseId) ?? []
    const workingSets = own.filter((s) => !s.isWarmup).length
    return { exerciseId, name, plan: entry, sets: own, workingSets, done: entry !== undefined && workingSets >= entry.targetSets }
  }

  const result: SessionExercise[] = []
  for (const entry of plan) if (!seen.has(entry.exerciseId)) result.push(make(entry.exerciseId, entry.name, entry))

  const extrasWithSets = [...byExercise.entries()]
    .filter(([id]) => !seen.has(id))
    .sort(([, a], [, b]) => Math.min(...a.map((s) => s.completedAt)) - Math.min(...b.map((s) => s.completedAt)))
  for (const [id] of extrasWithSets) result.push(make(id, nameOf(id)))

  for (const a of adhoc) if (!seen.has(a.exerciseId)) result.push(make(a.exerciseId, a.name))
  return result
}

/** Index of the first exercise that still needs sets, searching forward from `from` and wrapping. -1 if none. */
export function nextIncomplete(exercises: readonly SessionExercise[], from = 0): number {
  const n = exercises.length
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n
    const e = exercises[i]!
    if (e.plan ? !e.done : e.sets.length === 0) return i
  }
  return -1
}

/**
 * Suggested values for the next working set of an exercise.
 *
 * - Reps follow the same set from last session (or its last set), else this session's last set, else the target.
 * - Weight follows last session's matching set, unless you've already changed the load this session,
 *   in which case it keeps the weight you used on your last set.
 */
export function prefillSet(input: {
  previous: readonly SetValues[]
  current: readonly SetValues[]
  targetWeight?: number
  targetReps?: string
}): SetValues {
  const { previous, current } = input
  const index = current.length
  const prev = previous[index] ?? previous.at(-1)
  const last = current.at(-1)
  const lastPlannedLike = previous[index - 1]
  const changedLoad = last !== undefined && (lastPlannedLike === undefined || last.weight !== lastPlannedLike.weight)

  const weight = changedLoad ? last.weight : (prev?.weight ?? last?.weight ?? input.targetWeight ?? 0)
  const targetMin = parseRepTarget(input.targetReps ?? '')?.min ?? parseRepTarget(DEFAULT_TARGET_REPS)!.min
  const reps = prev?.reps ?? last?.reps ?? targetMin
  return { weight, reps }
}

/** Weight of one set: "80 kg", "BW", or "BW + 10 kg" for a loaded bodyweight exercise. */
export function formatSetWeight(weight: number, bodyweight: boolean, unit: WeightUnit = 'kg'): string {
  if (weight === 0) return 'BW'
  const mass = formatMass(weight, unit)
  return bodyweight ? `BW + ${mass}` : mass
}

/** "80 kg × 8, 8, 7"; mixed loads are grouped: "80 kg × 8 · 85 kg × 6, 5". Null if there are no sets. */
export function formatSetsSummary(sets: readonly SetValues[], bodyweight: boolean, unit: WeightUnit = 'kg'): string | null {
  if (sets.length === 0) return null
  const groups: { weight: number; reps: number[] }[] = []
  for (const s of sets) {
    const g = groups.at(-1)
    if (g && g.weight === s.weight) g.reps.push(s.reps)
    else groups.push({ weight: s.weight, reps: [s.reps] })
  }
  return groups.map((g) => `${formatSetWeight(g.weight, bodyweight, unit)} × ${g.reps.join(', ')}`).join(' · ')
}

/** Next day in the rotation after the one last trained (wrapping), or the first day. */
export function suggestNextDay<T extends { id: number }>(days: readonly T[], lastTrainedDayId: number | undefined): T | undefined {
  const i = days.findIndex((d) => d.id === lastTrainedDayId)
  return i === -1 ? days[0] : days[(i + 1) % days.length]
}

/**
 * Whether to treat weight as extra load on bodyweight: planned at BW (0), or,
 * for an unplanned exercise, last done entirely at BW.
 */
export function isBodyweightExercise(targetWeight: number | undefined, plannedHere: boolean, previous: readonly SetValues[]): boolean {
  if (plannedHere) return !targetWeight
  return previous.length > 0 && previous.every((s) => s.weight === 0)
}
