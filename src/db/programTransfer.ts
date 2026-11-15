import { db } from './db'
import type { Exercise, ProgramDay, ProgramDayExercise } from './types'
import { findByName } from '../lib/search'
import { uniqueProgramName, type ProgramExport } from '../lib/programFile'

type WithId<T> = T & { id: number }
const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order

/** One program with its days and targets, exercises by name. Null if it doesn't exist. */
export async function exportProgram(programId: number): Promise<ProgramExport | null> {
  return db.transaction('r', [db.programs, db.programDays, db.programDayExercises, db.exercises], async () => {
    const program = await db.programs.get(programId)
    if (!program) return null
    const days = ((await db.programDays.where('programId').equals(programId).toArray()) as WithId<ProgramDay>[]).sort(byOrder)
    const items = (await db.programDayExercises.where('programDayId').anyOf(days.map((d) => d.id)).toArray()) as WithId<ProgramDayExercise>[]
    const exercises = new Map(((await db.exercises.toArray()) as WithId<Exercise>[]).map((e) => [e.id, e]))
    const out: ProgramExport = {
      name: program.name,
      days: days.map((day) => ({
        name: day.name,
        exercises: items
          .filter((i) => i.programDayId === day.id)
          .sort(byOrder)
          .flatMap((i) => {
            const ex = exercises.get(i.exerciseId)
            if (!ex) return []
            return [
              {
                name: ex.name,
                ...(ex.muscleGroup !== undefined && { muscleGroup: ex.muscleGroup }),
                ...(ex.notes !== undefined && { notes: ex.notes }),
                targetSets: i.targetSets,
                targetReps: i.targetReps,
                ...(i.targetWeight !== undefined && { targetWeight: i.targetWeight }),
                restSeconds: i.restSeconds,
              },
            ]
          }),
      })),
    }
    if (program.notes !== undefined) out.notes = program.notes
    return out
  })
}

export interface ImportResult {
  programId: number
  name: string
  newExercises: number
}

/**
 * Adds the program as a new one; nothing existing is changed. Exercises are
 * matched by name (ignoring case), and missing ones are added to the library.
 * If the name is taken, " (2)" etc. is appended. All or nothing.
 */
export async function importProgram(p: ProgramExport): Promise<ImportResult> {
  return db.transaction('rw', [db.programs, db.programDays, db.programDayExercises, db.exercises], async () => {
    const name = uniqueProgramName(
      p.name,
      (await db.programs.toArray()).map((x) => x.name),
    )
    const programId = (await db.programs.add({ name, archived: false, ...(p.notes !== undefined && { notes: p.notes }) })) as number
    const library = await db.exercises.toArray()
    let newExercises = 0
    for (const [dayIndex, day] of p.days.entries()) {
      const programDayId = (await db.programDays.add({ programId, name: day.name, order: dayIndex })) as number
      for (const [order, e] of day.exercises.entries()) {
        let exercise = findByName(library, e.name)
        if (!exercise) {
          exercise = { name: e.name, ...(e.muscleGroup !== undefined && { muscleGroup: e.muscleGroup }), ...(e.notes !== undefined && { notes: e.notes }) }
          exercise.id = (await db.exercises.add({ ...exercise })) as number
          library.push(exercise)
          newExercises++
        }
        await db.programDayExercises.add({
          programDayId,
          exerciseId: exercise.id!,
          order,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          ...(e.targetWeight !== undefined && { targetWeight: e.targetWeight }),
          restSeconds: e.restSeconds,
        })
      }
    }
    return { programId, name, newExercises }
  })
}
