import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, Program, ProgramDay, ProgramDayExercise, Session, WorkoutSet } from './types'
import { seedPrograms } from './seed'
import { buildSeedRows } from './seedRows'

export class GymDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  programs!: EntityTable<Program, 'id'>
  programDays!: EntityTable<ProgramDay, 'id'>
  programDayExercises!: EntityTable<ProgramDayExercise, 'id'>
  sessions!: EntityTable<Session, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>

  constructor() {
    super('gym')
    // Schema changes: add a new this.version(n + 1) block with an .upgrade() migration. Never edit an old version.
    this.version(1).stores({
      exercises: '++id, name',
      programs: '++id, name',
      programDays: '++id, programId',
      programDayExercises: '++id, programDayId, exerciseId',
      sessions: '++id, programDayId, startedAt',
      sets: '++id, sessionId, exerciseId, [exerciseId+completedAt]',
    })

    // 'populate' fires exactly once, when the database is first created (first launch).
    this.on('populate', async (tx) => {
      const rows = buildSeedRows(seedPrograms)
      await tx.table('exercises').bulkAdd(rows.exercises)
      await tx.table('programs').bulkAdd(rows.programs)
      await tx.table('programDays').bulkAdd(rows.programDays)
      await tx.table('programDayExercises').bulkAdd(rows.programDayExercises)
    })
  }
}

export const db = new GymDB()
