import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addSetToSession, listHistory, updateSessionNotes, updateSessionTimes } from './history'
import { finishSession, logSet, startSession } from './sessions'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const dayId = async (name: string) => (await db.programDays.filter((d) => d.name === name).first())!.id!
const exerciseId = async (name: string) => (await db.exercises.where('name').equals(name).first())!.id!

async function workout(dayName: string | undefined, startedAt: number, sets: [string, number, number][]) {
  const id = await startSession(dayName ? await dayId(dayName) : undefined, startedAt)
  let t = startedAt
  for (const [name, weight, reps] of sets) await logSet({ sessionId: id, exerciseId: await exerciseId(name), weight, reps, isWarmup: false }, (t += 60_000))
  await finishSession(id, t + 60_000)
  return id
}

describe('listHistory', () => {
  it('lists finished sessions newest first with titles and stats', async () => {
    await workout('Upper A', 1_000_000, [['Bench Press (Barbell)', 75, 7], ['Bench Press (Barbell)', 75, 6], ['Pull Up', 0, 4]])
    await workout(undefined, 2_000_000, [['Squat (Barbell)', 100, 5]])
    const running = await startSession(await dayId('Lower A'), 3_000_000)

    const list = await listHistory(10)
    expect(list.total).toBe(2)
    expect(list.active?.id).toBe(running)
    expect(list.items.map((i) => [i.title, i.programName, i.stats])).toEqual([
      ['Workout', undefined, { workingSets: 1, exercises: 1, volume: 500 }],
      ['Upper A', 'Upper/Lower', { workingSets: 3, exercises: 2, volume: 975 }],
    ])
  })

  it('limits the list but reports the total', async () => {
    for (let i = 0; i < 3; i++) await workout(undefined, 1_000_000 * (i + 1), [['Squat (Barbell)', 100, 5]])
    const list = await listHistory(2)
    expect(list.items).toHaveLength(2)
    expect(list.total).toBe(3)
    expect(list.items[0]!.session.startedAt).toBe(3_000_000)
  })

  it('counts the personal records set in each workout, and names the one in progress', async () => {
    await workout('Upper A', 1_000_000, [['Bench Press (Barbell)', 75, 6]])
    await workout('Upper A', 2_000_000, [['Bench Press (Barbell)', 77.5, 6], ['Bench Press (Barbell)', 80, 5], ['Bench Press (Barbell)', 75, 6]])
    await workout('Upper A', 3_000_000, [['Bench Press (Barbell)', 75, 6]])
    await startSession(await dayId('Lower A'), 4_000_000)
    const list = await listHistory(10)
    expect(list.items.map((i) => i.prCount)).toEqual([0, 2, 0])
    expect(list.activeTitle).toBe('Lower A')
  })
})

describe('editing a past session', () => {
  it('moves the start and shifts every set by the same amount', async () => {
    const id = await workout('Upper A', 10_000_000, [['Bench Press (Barbell)', 75, 7], ['Bench Press (Barbell)', 75, 6]])
    const before = (await db.sets.where('sessionId').equals(id).sortBy('completedAt')).map((s) => s.completedAt)
    await updateSessionTimes(id, 10_000_000 - 86_400_000, 10_000_000 - 86_400_000 + 3_600_000)
    const after = (await db.sets.where('sessionId').equals(id).sortBy('completedAt')).map((s) => s.completedAt)
    expect(after).toEqual(before.map((t) => t - 86_400_000))
    expect(await db.sessions.get(id)).toMatchObject({ startedAt: 10_000_000 - 86_400_000, finishedAt: 10_000_000 - 86_400_000 + 3_600_000 })
  })

  it('changing only the finish time leaves sets alone', async () => {
    const id = await workout(undefined, 10_000_000, [['Squat (Barbell)', 100, 5]])
    const before = await db.sets.where('sessionId').equals(id).toArray()
    await updateSessionTimes(id, 10_000_000, 99_000_000)
    expect(await db.sets.where('sessionId').equals(id).toArray()).toEqual(before)
  })

  it('saves trimmed notes and clears empty ones', async () => {
    const id = await workout(undefined, 1, [])
    await updateSessionNotes(id, '  felt strong  ')
    expect((await db.sessions.get(id))?.notes).toBe('felt strong')
    await updateSessionNotes(id, '   ')
    expect((await db.sessions.get(id))?.notes).toBeUndefined()
  })

  it('adds a set inside the old workout, after its last set', async () => {
    const id = await workout(undefined, 10_000_000, [['Squat (Barbell)', 100, 5]])
    const last = (await db.sets.where('sessionId').equals(id).first())!
    const newId = await addSetToSession(id, { exerciseId: last.exerciseId, weight: 100, reps: 4, isWarmup: false })
    expect(await db.sets.get(newId)).toMatchObject({ order: 1, completedAt: last.completedAt + 1000, sessionId: id })
  })

  it('adds the first set of a new exercise at the workout start', async () => {
    const id = await workout(undefined, 10_000_000, [])
    const newId = await addSetToSession(id, { exerciseId: await exerciseId('Deadlift (Barbell)'), weight: 120, reps: 5, isWarmup: false })
    expect(await db.sets.get(newId)).toMatchObject({ order: 0, completedAt: 10_000_000 })
  })
})
