import { db } from './db'
import type { Exercise, Program, ProgramDay, ProgramDayExercise } from './types'
import { orderUpdates } from '../lib/order'
import { DEFAULT_REST_SECONDS, DEFAULT_TARGET_REPS, DEFAULT_TARGET_SETS } from '../lib/targets'

type WithId<T> = T & { id: number }

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order

async function writeOrder(table: typeof db.programDays | typeof db.programDayExercises, rows: { id: number; order: number }[]) {
  for (const u of orderUpdates(rows)) await table.update(u.id, { order: u.order })
}

// ---------- queries ----------

export interface ProgramListItem {
  program: WithId<Program>
  dayNames: string[]
}

export async function listPrograms(): Promise<ProgramListItem[]> {
  const [programs, days] = await Promise.all([db.programs.toArray(), db.programDays.toArray()])
  return (programs as WithId<Program>[])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((program) => ({
      program,
      dayNames: days.filter((d) => d.programId === program.id).sort(byOrder).map((d) => d.name),
    }))
}

export interface ProgramDetail {
  program: WithId<Program>
  days: { day: WithId<ProgramDay>; exerciseCount: number }[]
}

export async function getProgramDetail(programId: number): Promise<ProgramDetail | null> {
  const program = await db.programs.get(programId)
  if (!program) return null
  const days = (await db.programDays.where('programId').equals(programId).toArray()) as WithId<ProgramDay>[]
  const dayIds = days.map((d) => d.id)
  const items = await db.programDayExercises.where('programDayId').anyOf(dayIds).toArray()
  return {
    program: program as WithId<Program>,
    days: days.sort(byOrder).map((day) => ({ day, exerciseCount: items.filter((i) => i.programDayId === day.id).length })),
  }
}

export interface DayDetail {
  program: WithId<Program>
  day: WithId<ProgramDay>
  items: { item: WithId<ProgramDayExercise>; exercise: WithId<Exercise> | undefined }[]
}

export async function getDayDetail(dayId: number): Promise<DayDetail | null> {
  const day = await db.programDays.get(dayId)
  if (!day) return null
  const program = await db.programs.get(day.programId)
  if (!program) return null
  const items = ((await db.programDayExercises.where('programDayId').equals(dayId).toArray()) as WithId<ProgramDayExercise>[]).sort(byOrder)
  const exercises = (await db.exercises.bulkGet(items.map((i) => i.exerciseId))) as (WithId<Exercise> | undefined)[]
  return {
    program: program as WithId<Program>,
    day: day as WithId<ProgramDay>,
    items: items.map((item, i) => ({ item, exercise: exercises[i] })),
  }
}

// ---------- programs ----------

export async function createProgram(name: string): Promise<number> {
  return db.programs.add({ name, archived: false }) as Promise<number>
}

export async function updateProgram(id: number, changes: Partial<Pick<Program, 'name' | 'notes' | 'archived'>>): Promise<void> {
  await db.programs.update(id, changes)
}

/** Deletes the program with its days and their exercise targets. Logged sessions are kept. */
export async function deleteProgram(id: number): Promise<void> {
  await db.transaction('rw', [db.programs, db.programDays, db.programDayExercises], async () => {
    const dayIds = (await db.programDays.where('programId').equals(id).primaryKeys()) as number[]
    await db.programDayExercises.where('programDayId').anyOf(dayIds).delete()
    await db.programDays.bulkDelete(dayIds)
    await db.programs.delete(id)
  })
}

// ---------- days ----------

export async function addDay(programId: number, name: string): Promise<number> {
  return db.transaction('rw', db.programDays, async () => {
    const count = await db.programDays.where('programId').equals(programId).count()
    return db.programDays.add({ programId, name, order: count }) as Promise<number>
  })
}

export async function renameDay(id: number, name: string): Promise<void> {
  await db.programDays.update(id, { name })
}

/** Deletes the day and its exercise targets, then closes the gap in the order. Logged sessions are kept. */
export async function deleteDay(id: number): Promise<void> {
  await db.transaction('rw', [db.programDays, db.programDayExercises], async () => {
    const day = await db.programDays.get(id)
    if (!day) return
    await db.programDayExercises.where('programDayId').equals(id).delete()
    await db.programDays.delete(id)
    const rest = (await db.programDays.where('programId').equals(day.programId).toArray()) as WithId<ProgramDay>[]
    await writeOrder(db.programDays, rest.sort(byOrder))
  })
}

/** Saves a new order for a program's days. `orderedIds` must list every day of the program. */
export async function reorderDays(programId: number, orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.programDays, async () => {
    const days = (await db.programDays.where('programId').equals(programId).toArray()) as WithId<ProgramDay>[]
    const byId = new Map(days.map((d) => [d.id, d]))
    if (orderedIds.length !== days.length || !orderedIds.every((id) => byId.has(id))) throw new Error('reorderDays: id list does not match the program')
    await writeOrder(db.programDays, orderedIds.map((id) => byId.get(id)!))
  })
}

// ---------- exercises within a day ----------

/**
 * Appends an exercise to a day. Targets are copied from the same exercise on
 * another day if it has one, otherwise defaults (weight 0 = BW, rest from Settings).
 */
export async function addDayExercise(programDayId: number, exerciseId: number, defaultRestSeconds = DEFAULT_REST_SECONDS): Promise<number> {
  return db.transaction('rw', db.programDayExercises, async () => {
    const count = await db.programDayExercises.where('programDayId').equals(programDayId).count()
    const existing = await db.programDayExercises.where('exerciseId').equals(exerciseId).first()
    return db.programDayExercises.add({
      programDayId,
      exerciseId,
      order: count,
      targetSets: existing?.targetSets ?? DEFAULT_TARGET_SETS,
      targetReps: existing?.targetReps ?? DEFAULT_TARGET_REPS,
      targetWeight: existing?.targetWeight ?? 0,
      restSeconds: existing?.restSeconds ?? defaultRestSeconds,
    }) as Promise<number>
  })
}

export async function updateDayExercise(
  id: number,
  changes: Partial<Pick<ProgramDayExercise, 'targetSets' | 'targetReps' | 'targetWeight' | 'restSeconds'>>,
): Promise<void> {
  await db.programDayExercises.update(id, changes)
}

export async function removeDayExercise(id: number): Promise<void> {
  await db.transaction('rw', db.programDayExercises, async () => {
    const item = await db.programDayExercises.get(id)
    if (!item) return
    await db.programDayExercises.delete(id)
    const rest = (await db.programDayExercises.where('programDayId').equals(item.programDayId).toArray()) as WithId<ProgramDayExercise>[]
    await writeOrder(db.programDayExercises, rest.sort(byOrder))
  })
}

/** Saves a new order for a day's exercises. `orderedIds` must list every exercise of the day. */
export async function reorderDayExercises(programDayId: number, orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.programDayExercises, async () => {
    const items = (await db.programDayExercises.where('programDayId').equals(programDayId).toArray()) as WithId<ProgramDayExercise>[]
    const byId = new Map(items.map((i) => [i.id, i]))
    if (orderedIds.length !== items.length || !orderedIds.every((id) => byId.has(id))) throw new Error('reorderDayExercises: id list does not match the day')
    await writeOrder(db.programDayExercises, orderedIds.map((id) => byId.get(id)!))
  })
}
