/** Coaching on top of the log: when to add weight, and which sets were personal records. */
import { epley } from './progress'
import type { SetValues } from './session'
import { parseRepTarget } from './targets'
import { fromDisplay, stepWeight, toDisplay, type WeightUnit } from './units'

export interface Suggestion {
  /** Weight to try this time, in kg. */
  weight: number
  /** The rep count every set reached last time (top of the range). */
  reps: number
  sets: number
}

/**
 * Double progression: when last time's planned sets were all done at one load
 * and every one reached the top of the rep range, go up one step (2.5 kg, or the
 * next 5 lb mark when showing lb). Null when there's nothing to suggest, including
 * pure bodyweight work (no load to add to) and unplanned exercises.
 */
export function suggestNextWeight(
  previous: readonly SetValues[],
  plan: { targetSets: number; targetReps: string } | undefined,
  unit: WeightUnit = 'kg',
): Suggestion | null {
  if (!plan || plan.targetSets < 1) return null
  const target = parseRepTarget(plan.targetReps)
  if (!target) return null
  const planned = previous.slice(0, plan.targetSets)
  if (planned.length < plan.targetSets) return null
  const weight = planned[0]!.weight
  if (weight <= 0) return null
  if (!planned.every((s) => s.weight === weight && s.reps >= target.max)) return null
  const next = fromDisplay(stepWeight(toDisplay(weight, unit), 1, unit), unit)
  return { weight: next, reps: target.max, sets: planned.length }
}

export interface PRCandidate {
  id: number
  weight: number
  reps: number
  isWarmup: boolean
  completedAt: number
}

/**
 * Ids of working sets that were personal records when done: a higher estimated
 * 1RM or a heavier weight than every earlier working set of the same exercise, or,
 * at bodyweight, more reps than any earlier bodyweight set. The very first set
 * only sets the baseline. Pass every set of one exercise, in any order.
 */
export function findPRs(sets: readonly PRCandidate[]): Set<number> {
  const ordered = sets.filter((s) => !s.isWarmup).sort((a, b) => a.completedAt - b.completedAt || a.id - b.id)
  const prs = new Set<number>()
  let bestE1rm = -Infinity
  let bestWeight = -Infinity
  let bestBwReps = -Infinity
  let seen = false
  for (const s of ordered) {
    const e1rm = epley(s.weight, s.reps)
    const isPR = s.weight === 0 ? seen && bestBwReps > -Infinity && s.reps > bestBwReps : seen && (e1rm > bestE1rm || s.weight > bestWeight)
    if (isPR) prs.add(s.id)
    if (s.weight === 0) bestBwReps = Math.max(bestBwReps, s.reps)
    else {
      bestE1rm = Math.max(bestE1rm, e1rm)
      bestWeight = Math.max(bestWeight, s.weight)
    }
    seen = true
  }
  return prs
}
