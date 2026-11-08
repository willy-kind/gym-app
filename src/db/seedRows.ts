import type { SeedProgram } from '../lib/parsePrograms'
import type { Exercise, Program, ProgramDay, ProgramDayExercise } from './types'

export interface SeedRows {
  exercises: Required<Pick<Exercise, 'id' | 'name'>>[]
  programs: (Program & { id: number })[]
  programDays: (ProgramDay & { id: number })[]
  programDayExercises: (ProgramDayExercise & { id: number })[]
}

/**
 * Turns parsed programs into table rows with explicit ids, so references
 * between tables are known before anything is written. An exercise that
 * appears on several days (e.g. Pull Up) becomes one exercise row.
 */
export function buildSeedRows(programs: SeedProgram[]): SeedRows {
  const rows: SeedRows = { exercises: [], programs: [], programDays: [], programDayExercises: [] }
  const exerciseIds = new Map<string, number>()

  programs.forEach((p, pi) => {
    const programId = pi + 1
    rows.programs.push({ id: programId, name: p.name, archived: false })

    p.days.forEach((d, di) => {
      const programDayId = rows.programDays.length + 1
      rows.programDays.push({ id: programDayId, programId, name: d.name, order: di })

      d.exercises.forEach((e, ei) => {
        let exerciseId = exerciseIds.get(e.name)
        if (exerciseId === undefined) {
          exerciseId = rows.exercises.length + 1
          exerciseIds.set(e.name, exerciseId)
          rows.exercises.push({ id: exerciseId, name: e.name })
        }
        rows.programDayExercises.push({
          id: rows.programDayExercises.length + 1,
          programDayId,
          exerciseId,
          order: ei,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetWeight: e.targetWeight,
          restSeconds: e.restSeconds,
        })
      })
    })
  })
  return rows
}
