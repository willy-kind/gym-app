import { db } from './db'

export interface ProgramOverview {
  id: number
  name: string
  days: {
    id: number
    name: string
    exercises: { id: number; name: string; targetSets: number; targetReps: string; targetWeight?: number }[]
  }[]
}

/** Active programs with their days and exercises, in order. */
export async function loadProgramOverview(): Promise<ProgramOverview[]> {
  return db.transaction('r', [db.programs, db.programDays, db.programDayExercises, db.exercises], async () => {
    const [programs, days, dayExercises, exercises] = await Promise.all([
      db.programs.toArray(),
      db.programDays.toArray(),
      db.programDayExercises.toArray(),
      db.exercises.toArray(),
    ])
    const exerciseName = new Map(exercises.map((e) => [e.id!, e.name]))
    return programs
      .filter((p) => !p.archived)
      .map((p) => ({
        id: p.id!,
        name: p.name,
        days: days
          .filter((d) => d.programId === p.id)
          .sort((a, b) => a.order - b.order)
          .map((d) => ({
            id: d.id!,
            name: d.name,
            exercises: dayExercises
              .filter((x) => x.programDayId === d.id)
              .sort((a, b) => a.order - b.order)
              .map((x) => ({
                id: x.id!,
                name: exerciseName.get(x.exerciseId) ?? 'Unknown exercise',
                targetSets: x.targetSets,
                targetReps: x.targetReps,
                targetWeight: x.targetWeight,
              })),
          })),
      }))
  })
}
