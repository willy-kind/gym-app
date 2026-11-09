import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addDay,
  addDayExercise,
  createProgram,
  deleteDay,
  deleteProgram,
  getDayDetail,
  getProgramDetail,
  listPrograms,
  removeDayExercise,
  reorderDayExercises,
  reorderDays,
  updateProgram,
} from './programs'
import { deleteExerciseIfUnused, DuplicateExerciseError, findOrCreateExercise, getExerciseUsage, updateExercise } from './exercises'
import { DEFAULT_REST_SECONDS, DEFAULT_TARGET_REPS, DEFAULT_TARGET_SETS } from '../lib/targets'

// Each test starts from a freshly created (and therefore freshly seeded) database.
beforeEach(async () => {
  await db.delete()
  await db.open()
})

const exerciseId = async (name: string) => (await db.exercises.where('name').equals(name).first())!.id!
const dayId = async (name: string) => (await db.programDays.filter((d) => d.name === name).first())!.id!
const dayOrder = async (programId: number) =>
  (await db.programDays.where('programId').equals(programId).sortBy('order')).map((d) => [d.name, d.order])
const itemOrder = async (programDayId: number) =>
  (await db.programDayExercises.where('programDayId').equals(programDayId).sortBy('order')).map((i) => [i.exerciseId, i.order])

async function logSet(exId: number) {
  const sessionId = (await db.sessions.add({ startedAt: Date.now(), programDayId: await dayId('Upper A') })) as number
  await db.sets.add({ sessionId, exerciseId: exId, order: 0, weight: 80, reps: 8, isWarmup: false, completedAt: Date.now() })
  return sessionId
}

describe('first launch seed', () => {
  it('creates the program from programs.md', async () => {
    expect(await db.programs.count()).toBe(1)
    expect(await db.programDays.count()).toBe(4)
    expect(await db.exercises.count()).toBe(25)
    expect(await db.programDayExercises.count()).toBe(26)
  })

  it('exposes it through the screen queries in order', async () => {
    const [item] = await listPrograms()
    expect(item?.dayNames).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B'])
    const detail = await getDayDetail(await dayId('Lower B'))
    expect(detail?.items.map((i) => i.exercise?.name)).toEqual([
      'Deadlift (Barbell)',
      'Leg Press (Single Leg)',
      'Leg Extension (Machine)',
      'Standing Calf Raise (Machine)',
    ])
    expect(detail?.items[0]?.item).toMatchObject({ targetSets: 4, targetReps: '5', targetWeight: 120, restSeconds: 180 })
  })

  it('does not re-seed when the database already exists', async () => {
    await deleteProgram(1)
    db.close()
    await db.open()
    expect(await db.programs.count()).toBe(0)
  })
})

describe('programs', () => {
  it('creates, renames and archives', async () => {
    const id = await createProgram('PPL')
    await updateProgram(id, { name: 'Push Pull Legs', archived: true })
    expect(await db.programs.get(id)).toMatchObject({ name: 'Push Pull Legs', archived: true })
  })

  it('deletes days and targets but keeps exercises and logged sessions', async () => {
    const sessionId = await logSet(await exerciseId('Pull Up'))
    await deleteProgram(1)
    expect(await db.programs.count()).toBe(0)
    expect(await db.programDays.count()).toBe(0)
    expect(await db.programDayExercises.count()).toBe(0)
    expect(await db.exercises.count()).toBe(25)
    expect(await db.sessions.get(sessionId)).toBeDefined()
    expect(await db.sets.where('sessionId').equals(sessionId).count()).toBe(1)
  })

  it('leaves other programs alone when deleting one', async () => {
    const other = await createProgram('Other')
    const otherDay = await addDay(other, 'Only day')
    await addDayExercise(otherDay, await exerciseId('Pull Up'))
    await deleteProgram(1)
    expect(await getProgramDetail(other)).toMatchObject({ days: [{ exerciseCount: 1 }] })
  })
})

describe('days', () => {
  it('appends new days at the end', async () => {
    await addDay(1, 'Arms')
    expect((await dayOrder(1)).at(-1)).toEqual(['Arms', 4])
  })

  it('reorders days', async () => {
    const ids = (await db.programDays.where('programId').equals(1).sortBy('order')).map((d) => d.id!)
    await reorderDays(1, [ids[3]!, ids[0]!, ids[1]!, ids[2]!])
    expect(await dayOrder(1)).toEqual([
      ['Lower B', 0],
      ['Upper A', 1],
      ['Lower A', 2],
      ['Upper B', 3],
    ])
  })

  it('rejects a reorder that does not list exactly the program’s days', async () => {
    await expect(reorderDays(1, [1, 2, 3])).rejects.toThrow()
    await expect(reorderDays(1, [1, 2, 3, 99])).rejects.toThrow()
  })

  it('deletes a day, its targets, and closes the order gap; sessions stay', async () => {
    const lowerA = await dayId('Lower A')
    const sessionId = (await db.sessions.add({ startedAt: Date.now(), programDayId: lowerA })) as number
    await deleteDay(lowerA)
    expect(await dayOrder(1)).toEqual([
      ['Upper A', 0],
      ['Upper B', 1],
      ['Lower B', 2],
    ])
    expect(await db.programDayExercises.where('programDayId').equals(lowerA).count()).toBe(0)
    expect(await db.sessions.get(sessionId)).toBeDefined()
  })
})

describe('exercises within a day', () => {
  it('copies targets from another day when the exercise is already programmed', async () => {
    const lowerA = await dayId('Lower A')
    const id = await addDayExercise(lowerA, await exerciseId('Pull Up'))
    expect(await db.programDayExercises.get(id)).toMatchObject({ order: 5, targetSets: 6, targetReps: '3-4', targetWeight: 0, restSeconds: 120 })
  })

  it('uses defaults for a brand-new exercise', async () => {
    const exId = await findOrCreateExercise('Hip Thrust (Barbell)')
    const id = await addDayExercise(await dayId('Lower A'), exId)
    expect(await db.programDayExercises.get(id)).toMatchObject({
      targetSets: DEFAULT_TARGET_SETS,
      targetReps: DEFAULT_TARGET_REPS,
      targetWeight: 0,
      restSeconds: DEFAULT_REST_SECONDS,
    })
  })

  it('removes an exercise and renumbers the rest', async () => {
    const lowerB = await dayId('Lower B')
    const items = await db.programDayExercises.where('programDayId').equals(lowerB).sortBy('order')
    await removeDayExercise(items[1]!.id!)
    expect((await itemOrder(lowerB)).map(([, order]) => order)).toEqual([0, 1, 2])
    expect((await itemOrder(lowerB)).map(([ex]) => ex)).toEqual([items[0]!.exerciseId, items[2]!.exerciseId, items[3]!.exerciseId])
  })

  it('reorders exercises in a day', async () => {
    const lowerB = await dayId('Lower B')
    const ids = (await db.programDayExercises.where('programDayId').equals(lowerB).sortBy('order')).map((i) => i.id!)
    await reorderDayExercises(lowerB, [...ids].reverse())
    const after = (await db.programDayExercises.where('programDayId').equals(lowerB).sortBy('order')).map((i) => i.id!)
    expect(after).toEqual([...ids].reverse())
    await expect(reorderDayExercises(lowerB, ids.slice(1))).rejects.toThrow()
  })
})

describe('exercise library', () => {
  it('finds an existing exercise ignoring case instead of duplicating it', async () => {
    expect(await findOrCreateExercise('  pull UP ')).toBe(await exerciseId('Pull Up'))
    expect(await db.exercises.count()).toBe(25)
  })

  it('refuses to rename onto another exercise’s name but allows changing case', async () => {
    const id = await exerciseId('Pull Up')
    await expect(updateExercise(id, { name: 'chest dip' })).rejects.toThrow(DuplicateExerciseError)
    await updateExercise(id, { name: 'Pull-Up', muscleGroup: 'Back' })
    await updateExercise(id, { name: 'pull-up' })
    expect(await db.exercises.get(id)).toMatchObject({ name: 'pull-up', muscleGroup: 'Back' })
  })

  it('reports usage and only deletes unused exercises', async () => {
    const pullUp = await exerciseId('Pull Up')
    expect(await getExerciseUsage(pullUp)).toEqual({ dayCount: 2, setCount: 0 })
    expect(await deleteExerciseIfUnused(pullUp)).toBe(false)

    const fresh = await findOrCreateExercise('Shrug')
    await logSet(fresh)
    expect(await deleteExerciseIfUnused(fresh)).toBe(false)

    const unused = await findOrCreateExercise('Nordic Curl')
    expect(await deleteExerciseIfUnused(unused)).toBe(true)
    expect(await db.exercises.get(unused)).toBeUndefined()
  })
})
