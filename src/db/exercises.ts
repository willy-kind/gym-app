import { db } from './db'
import type { Exercise } from './types'
import { findByName } from '../lib/search'

type WithId<T> = T & { id: number }

export async function listExercises(): Promise<WithId<Exercise>[]> {
  return (await db.exercises.toArray()) as WithId<Exercise>[]
}

export async function getExercise(id: number): Promise<WithId<Exercise> | undefined> {
  return (await db.exercises.get(id)) as WithId<Exercise> | undefined
}

/** Returns the existing exercise with this name (ignoring case) or creates it. */
export async function findOrCreateExercise(name: string): Promise<number> {
  return db.transaction('rw', db.exercises, async () => {
    const existing = findByName(await db.exercises.toArray(), name)
    if (existing?.id !== undefined) return existing.id
    return db.exercises.add({ name }) as Promise<number>
  })
}

export class DuplicateExerciseError extends Error {
  constructor(name: string) {
    super(`An exercise called "${name}" already exists.`)
    this.name = 'DuplicateExerciseError'
  }
}

export async function updateExercise(id: number, changes: Partial<Pick<Exercise, 'name' | 'muscleGroup' | 'notes'>>): Promise<void> {
  await db.transaction('rw', db.exercises, async () => {
    if (changes.name !== undefined) {
      const clash = findByName(await db.exercises.toArray(), changes.name)
      if (clash && clash.id !== id) throw new DuplicateExerciseError(changes.name)
    }
    await db.exercises.update(id, changes)
  })
}

export interface ExerciseUsage {
  dayCount: number
  setCount: number
}

export async function getExerciseUsage(id: number): Promise<ExerciseUsage> {
  const [dayCount, setCount] = await Promise.all([
    db.programDayExercises.where('exerciseId').equals(id).count(),
    db.sets.where('exerciseId').equals(id).count(),
  ])
  return { dayCount, setCount }
}

/** Deletes an exercise only if no program day or logged set uses it. Returns false if it is in use. */
export async function deleteExerciseIfUnused(id: number): Promise<boolean> {
  return db.transaction('rw', [db.exercises, db.programDayExercises, db.sets], async () => {
    const usage = await getExerciseUsage(id)
    if (usage.dayCount > 0 || usage.setCount > 0) return false
    await db.exercises.delete(id)
    return true
  })
}
