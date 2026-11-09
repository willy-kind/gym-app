import { db } from './db'
import type { WorkoutSet } from './types'
import { findByName } from '../lib/search'
import { setTimes, strongNote, type StrongWorkout } from '../lib/strongImport'

export interface StrongImportPlan {
  /** Workouts not in the app yet (no workout starts at the same time). */
  workouts: StrongWorkout[]
  /** Workouts skipped because one with the same start time is already here. */
  duplicates: number
  sets: number
  /** Exercise names that aren't in the library yet and will be created. */
  newExercises: string[]
}

async function plan(workouts: readonly StrongWorkout[]): Promise<StrongImportPlan> {
  const [sessions, exercises] = await Promise.all([db.sessions.toArray(), db.exercises.toArray()])
  const starts = new Set(sessions.map((s) => s.startedAt))
  const fresh = workouts.filter((w) => !starts.has(w.startedAt))
  const newExercises: string[] = []
  const known = [...exercises]
  for (const w of fresh) {
    for (const s of w.sets) {
      if (!findByName(known, s.exercise)) {
        known.push({ name: s.exercise })
        newExercises.push(s.exercise)
      }
    }
  }
  return {
    workouts: fresh,
    duplicates: workouts.length - fresh.length,
    sets: fresh.reduce((n, w) => n + w.sets.length, 0),
    newExercises,
  }
}

/** What an import would add, without changing anything. */
export function planStrongImport(workouts: readonly StrongWorkout[]): Promise<StrongImportPlan> {
  return plan(workouts)
}

/**
 * Adds the workouts that aren't here yet, all or nothing. Exercises are matched
 * by name (case and spacing ignored) and created when missing. Each workout gets
 * the note "Strong: <name>" and isn't linked to a program day.
 */
export async function importStrong(workouts: readonly StrongWorkout[]): Promise<StrongImportPlan> {
  return db.transaction('rw', db.sessions, db.sets, db.exercises, async () => {
    const p = await plan(workouts)
    const exercises = await db.exercises.toArray()
    const idOf = async (name: string): Promise<number> => {
      const found = findByName(exercises, name)
      if (found?.id !== undefined) return found.id
      const id = (await db.exercises.add({ name })) as number
      exercises.push({ id, name })
      return id
    }
    for (const w of p.workouts) {
      const times = setTimes(w)
      const lastSet = times.at(-1) ?? w.startedAt
      const finishedAt = Math.max(w.startedAt + (w.durationMs ?? 0), lastSet)
      const sessionId = (await db.sessions.add({ startedAt: w.startedAt, finishedAt, notes: strongNote(w) })) as number
      const order = new Map<number, number>()
      const rows: WorkoutSet[] = []
      for (const [i, s] of w.sets.entries()) {
        const exerciseId = await idOf(s.exercise)
        const n = order.get(exerciseId) ?? 0
        order.set(exerciseId, n + 1)
        rows.push({ sessionId, exerciseId, order: n, weight: s.weight, reps: s.reps, isWarmup: s.isWarmup, completedAt: times[i]! })
      }
      await db.sets.bulkAdd(rows)
    }
    return p
  })
}
