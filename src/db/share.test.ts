import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { finishSession, logSet, startSession } from './sessions'
import { getShareWorkout, getShareWorkouts } from './share'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const DAY = 24 * 60 * 60 * 1000
const dayId = async (name: string) => (await db.programDays.filter((d) => d.name === name).first())!.id!
const exerciseId = async (name: string) => (await db.exercises.where('name').equals(name).first())!.id!

async function workout(dayName: string | undefined, startedAt: number, sets: [string, number, number, boolean?][]) {
  const id = await startSession(dayName ? await dayId(dayName) : undefined, startedAt)
  let t = startedAt
  for (const [name, weight, reps, isWarmup] of sets) {
    await logSet({ sessionId: id, exerciseId: await exerciseId(name), weight, reps, isWarmup: isWarmup ?? false }, (t += 120_000))
  }
  await finishSession(id, t + 60_000)
  return id
}

describe('getShareWorkout', () => {
  it('builds a workout with targets, warm-ups, PRs and the last earlier workout', async () => {
    const first = await workout('Upper A', 10 * DAY, [['Bench Press (Barbell)', 75, 7]])
    const second = await workout('Upper A', 20 * DAY, [['Bench Press (Barbell)', 40, 8, true], ['Bench Press (Barbell)', 77.5, 6], ['Squat (Barbell)', 100, 5]])
    // A later workout must not count as "last time" for the second one.
    await workout('Upper A', 30 * DAY, [['Bench Press (Barbell)', 80, 6]])

    const w = await getShareWorkout(second)
    expect(w?.title).toBe('Upper A')
    expect(w?.programName).toBe('Upper/Lower')
    const [bench, squat] = w!.exercises
    expect(bench).toMatchObject({ name: 'Bench Press (Barbell)', bodyweight: false, target: { targetSets: 4, targetReps: '6-7', targetWeight: 75, restSeconds: 180 } })
    expect(bench!.sets.map((s) => [s.weight, s.isWarmup, s.pr])).toEqual([
      [40, true, false],
      [77.5, false, true],
    ])
    expect(bench!.lastTime).toEqual({ date: 10 * DAY, sets: [{ weight: 75, reps: 7 }] })
    expect(squat).toMatchObject({ name: 'Squat (Barbell)', target: undefined })
    expect((await getShareWorkout(first))!.exercises[0]!.lastTime).toBeUndefined()
    expect(await getShareWorkout(999)).toBeNull()
  })
})

describe('getShareWorkouts', () => {
  it('picks the last 4 or 8 finished workouts, or the last 4 weeks, oldest first', async () => {
    const now = 100 * DAY
    for (let i = 0; i < 10; i++) await workout('Lower A', now - (10 - i) * 7 * DAY, [['Squat (Barbell)', 100 + i, 5]])
    await startSession(await dayId('Upper A'), now) // in progress: never included

    const last4 = await getShareWorkouts('last4', now)
    expect(last4.map((w) => w.exercises[0]!.sets[0]!.weight)).toEqual([106, 107, 108, 109])
    expect(await getShareWorkouts('last8', now)).toHaveLength(8)
    const weeks = await getShareWorkouts('4weeks', now)
    expect(weeks.map((w) => w.startedAt)).toEqual([now - 28 * DAY, now - 21 * DAY, now - 14 * DAY, now - 7 * DAY])
  })
})
