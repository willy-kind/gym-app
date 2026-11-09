import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { importStrong, planStrongImport } from './strongImport'
import { parseStrongCsv } from '../lib/strongImport'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const CSV = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE
2026-11-07 07:30:35,"Upper A",1h 57m,"bench press (barbell)",W,40,8,0,0,
2026-11-07 07:30:35,"Upper A",1h 57m,"bench press (barbell)",1,77.5,6,0,0,
2026-11-07 07:30:35,"Upper A",1h 57m,"bench press (barbell)",Rest Timer,0,0,0,180,
2026-11-07 07:30:35,"Upper A",1h 57m,"bench press (barbell)",2,77.5,6,0,0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Zottman Curl",1,12,10,0,0,
`

describe('Strong import', () => {
  it('plans, imports, matches and creates exercises, and skips duplicates next time', async () => {
    const { workouts } = parseStrongCsv(CSV)
    const plan = await planStrongImport(workouts)
    expect(plan).toMatchObject({ duplicates: 0, sets: 4, newExercises: ['Zottman Curl'] })
    expect(await db.sessions.count()).toBe(0) // planning changes nothing

    await importStrong(workouts)
    const session = (await db.sessions.toArray())[0]!
    expect(session.notes).toBe('Strong: Upper A')
    expect(session.programDayId).toBeUndefined()
    expect(session.finishedAt).toBe(session.startedAt + 117 * 60_000)

    const bench = (await db.exercises.where('name').equals('Bench Press (Barbell)').first())!
    const sets = await db.sets.where('sessionId').equals(session.id!).sortBy('completedAt')
    expect(sets.map((s) => [s.exerciseId === bench.id, s.order, s.weight, s.reps, s.isWarmup])).toEqual([
      [true, 0, 40, 8, true],
      [true, 1, 77.5, 6, false],
      [true, 2, 77.5, 6, false],
      [false, 0, 12, 10, false],
    ])
    expect((sets[2]!.completedAt - sets[1]!.completedAt) / 1000).toBe(180)
    expect(await db.exercises.where('name').equals('Zottman Curl').count()).toBe(1)

    const again = await planStrongImport(workouts)
    expect(again).toMatchObject({ duplicates: 1, sets: 0, newExercises: [] })
    await importStrong(workouts)
    expect(await db.sessions.count()).toBe(1)
  })
})
