import Dexie from 'dexie'
import { db } from './db'
import type { Exercise } from './types'
import { epley, progressPoints, type ProgressPoint } from '../lib/progress'

type WithId<T> = T & { id: number }

export interface TrainedExercise {
  exercise: WithId<Exercise>
  lastDate: number
  sessions: number
  bestE1rm: number
  /** Most reps in one working set (shown for bodyweight-only exercises). */
  bestReps: number
}

/** Exercises with at least one working set, most recently trained first. */
export async function listTrainedExercises(): Promise<TrainedExercise[]> {
  const [sets, sessions, exercises] = await Promise.all([db.sets.toArray(), db.sessions.toArray(), db.exercises.toArray()])
  const startedAt = new Map(sessions.map((s) => [s.id!, s.startedAt]))
  const byExercise = new Map<number, { last: number; sessions: Set<number>; best: number; reps: number }>()
  for (const s of sets) {
    if (s.isWarmup) continue
    const e = byExercise.get(s.exerciseId) ?? { last: 0, sessions: new Set<number>(), best: 0, reps: 0 }
    e.last = Math.max(e.last, startedAt.get(s.sessionId) ?? s.completedAt)
    e.sessions.add(s.sessionId)
    e.best = Math.max(e.best, epley(s.weight, s.reps))
    e.reps = Math.max(e.reps, s.reps)
    byExercise.set(s.exerciseId, e)
  }
  return exercises
    .filter((e) => byExercise.has(e.id!))
    .map((e) => {
      const x = byExercise.get(e.id!)!
      return { exercise: e as WithId<Exercise>, lastDate: x.last, sessions: x.sessions.size, bestE1rm: x.best, bestReps: x.reps }
    })
    .sort((a, b) => b.lastDate - a.lastDate)
}

export interface ExerciseProgress {
  exercise: WithId<Exercise>
  points: ProgressPoint[]
}

/** One progress point per session for an exercise, dated by when the session started. */
export async function getExerciseProgress(exerciseId: number): Promise<ExerciseProgress | null> {
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) return null
  const sets = await db.sets.where('[exerciseId+completedAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).toArray()
  const sessions = await db.sessions.bulkGet([...new Set(sets.map((s) => s.sessionId))])
  const startedAt = new Map(sessions.filter((s) => s !== undefined).map((s) => [s.id!, s.startedAt]))
  return {
    exercise: exercise as WithId<Exercise>,
    points: progressPoints(
      sets.map((s) => ({ sessionId: s.sessionId, date: startedAt.get(s.sessionId) ?? s.completedAt, weight: s.weight, reps: s.reps, isWarmup: s.isWarmup })),
    ),
  }
}
