import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { getExerciseProgress, listTrainedExercises } from './progress'
import { finishSession, logSet, startSession } from './sessions'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const exerciseId = async (name: string) => (await db.exercises.where('name').equals(name).first())!.id!

async function workout(startedAt: number, sets: [string, number, number, boolean?][]) {
  const id = await startSession(undefined, startedAt)
  let t = startedAt
  for (const [name, weight, reps, isWarmup] of sets) {
    await logSet({ sessionId: id, exerciseId: await exerciseId(name), weight, reps, isWarmup: isWarmup ?? false }, (t += 60_000))
  }
  await finishSession(id, t)
  return id
}

describe('progress queries', () => {
  it('lists only exercises with working sets, most recent first', async () => {
    await workout(1_000_000, [['Bench Press (Barbell)', 75, 7], ['Squat (Barbell)', 20, 10, true]])
    await workout(2_000_000, [['Pull Up', 0, 4]])
    await workout(3_000_000, [['Bench Press (Barbell)', 80, 6]])
    const list = await listTrainedExercises()
    expect(list.map((e) => [e.exercise.name, e.sessions, e.lastDate])).toEqual([
      ['Bench Press (Barbell)', 2, 3_000_000],
      ['Pull Up', 1, 2_000_000],
    ])
    expect(list[0]!.bestE1rm).toBe(96) // 80 × (1 + 6/30)
    expect(list[1]!.bestReps).toBe(4)
  })

  it('builds one point per session dated by session start', async () => {
    await workout(1_000_000, [['Bench Press (Barbell)', 75, 7], ['Bench Press (Barbell)', 75, 6]])
    await workout(2_000_000, [['Bench Press (Barbell)', 80, 6]])
    const progress = await getExerciseProgress(await exerciseId('Bench Press (Barbell)'))
    expect(progress?.points.map((p) => [p.date, p.topWeight, p.volume])).toEqual([
      [1_000_000, 75, 975],
      [2_000_000, 80, 480],
    ])
  })

  it('is null for a missing exercise and empty for an untrained one', async () => {
    expect(await getExerciseProgress(9999)).toBeNull()
    expect((await getExerciseProgress(await exerciseId('Deadlift (Barbell)')))?.points).toEqual([])
  })
})
