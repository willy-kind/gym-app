import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { exportProgram, importProgram } from './programTransfer'
import { getDayDetail, getProgramDetail } from './programs'
import { createProgramFile, parseProgramFile, serializeProgramFile } from '../lib/programFile'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('program export and import', () => {
  it('exports the seeded program with days and targets in order', async () => {
    const p = await exportProgram(1)
    expect(p?.days.map((d) => d.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B'])
    expect(p?.days[3]?.exercises[0]).toMatchObject({ name: 'Deadlift (Barbell)', targetSets: 4, targetReps: '5', targetWeight: 120, restSeconds: 180 })
    expect(await exportProgram(999)).toBeNull()
  })

  it('round-trips through a file as a new copy, reusing existing exercises', async () => {
    const before = await exportProgram(1)
    const parsed = parseProgramFile(serializeProgramFile(createProgramFile(before!, 0)))
    if (!parsed.ok) throw new Error(parsed.error)
    const exerciseCount = await db.exercises.count()

    const r = await importProgram(parsed.file.program)
    expect(r.newExercises).toBe(0)
    expect(await db.exercises.count()).toBe(exerciseCount)
    expect(r.name).toBe(`${before!.name} (2)`)
    expect(await exportProgram(r.programId)).toEqual({ ...before, name: r.name })
    expect(await db.programs.count()).toBe(2)
  })

  it('into an empty app, creates the exercises it needs once', async () => {
    const before = await exportProgram(1)
    await db.transaction('rw', [db.exercises, db.programs, db.programDays, db.programDayExercises], async () => {
      for (const t of [db.exercises, db.programs, db.programDays, db.programDayExercises]) await t.clear()
    })
    const r = await importProgram(before!)
    expect(r.name).toBe(before!.name)
    expect(r.newExercises).toBe(25)
    expect(await db.exercises.count()).toBe(25)
    expect(await exportProgram(r.programId)).toEqual(before)
  })

  it('matches exercise names ignoring case and keeps library details', async () => {
    const pullUp = (await db.exercises.where('name').equals('Pull Up').first())!
    const r = await importProgram({
      name: 'Mini',
      days: [{ name: 'Day', exercises: [
        { name: 'pull up', targetSets: 3, targetReps: '5', restSeconds: 90 },
        { name: 'Dip', muscleGroup: 'Chest', targetSets: 3, targetReps: '8', targetWeight: 0, restSeconds: 90 },
        { name: 'DIP', targetSets: 2, targetReps: '10', restSeconds: 60 },
      ] }],
    })
    expect(r.newExercises).toBe(1)
    const day = (await getProgramDetail(r.programId))!.days[0]!.day
    const items = (await getDayDetail(day.id))!.items
    expect(items.map((i) => i.exercise?.name)).toEqual(['Pull Up', 'Dip', 'Dip'])
    expect(items[0]!.exercise?.id).toBe(pullUp.id)
    expect(items[1]!.exercise).toMatchObject({ muscleGroup: 'Chest' })
  })
})
