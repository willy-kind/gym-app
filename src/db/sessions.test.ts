import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  deleteSet,
  discardSession,
  finishSession,
  getActiveSession,
  getLastTrainedByDay,
  getPreviousPerformance,
  getSessionView,
  logSet,
  startSession,
  updateSet,
} from './sessions'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const dayId = async (name: string) => (await db.programDays.filter((d) => d.name === name).first())!.id!
const exerciseId = async (name: string) => (await db.exercises.where('name').equals(name).first())!.id!

describe('session lifecycle', () => {
  it('starts one session at a time and resumes the running one', async () => {
    const upperA = await dayId('Upper A')
    const id = await startSession(upperA, 1000)
    expect(await startSession(await dayId('Lower A'))).toBe(id)
    expect(await getActiveSession()).toMatchObject({ id, programDayId: upperA, startedAt: 1000 })
  })

  it('finishing frees the slot for a new session', async () => {
    const id = await startSession(undefined, 1000)
    await finishSession(id, 2000)
    expect(await getActiveSession()).toBeUndefined()
    expect(await db.sessions.get(id)).toMatchObject({ finishedAt: 2000 })
    expect(await startSession()).not.toBe(id)
  })

  it('discarding deletes the session and its sets only', async () => {
    const bench = await exerciseId('Bench Press (Barbell)')
    const keep = await startSession(undefined, 1)
    await logSet({ sessionId: keep, exerciseId: bench, weight: 75, reps: 7, isWarmup: false })
    await finishSession(keep)
    const drop = await startSession(undefined, 2)
    await logSet({ sessionId: drop, exerciseId: bench, weight: 75, reps: 7, isWarmup: false })
    await discardSession(drop)
    expect(await db.sessions.get(drop)).toBeUndefined()
    expect(await db.sets.where('sessionId').equals(drop).count()).toBe(0)
    expect(await db.sets.where('sessionId').equals(keep).count()).toBe(1)
  })
})

describe('sets', () => {
  it('saves each set immediately with increasing order per exercise', async () => {
    const [bench, row] = [await exerciseId('Bench Press (Barbell)'), await exerciseId('Bent Over Row (Barbell)')]
    const s = await startSession()
    await logSet({ sessionId: s, exerciseId: bench, weight: 40, reps: 10, isWarmup: true }, 10)
    await logSet({ sessionId: s, exerciseId: bench, weight: 75, reps: 7, isWarmup: false }, 20)
    await logSet({ sessionId: s, exerciseId: row, weight: 70, reps: 7, isWarmup: false }, 30)
    const sets = await db.sets.where('sessionId').equals(s).sortBy('completedAt')
    expect(sets.map((x) => [x.exerciseId, x.order, x.completedAt])).toEqual([
      [bench, 0, 10],
      [bench, 1, 20],
      [row, 0, 30],
    ])
  })

  it('a logged set survives the app being closed mid-session', async () => {
    const s = await startSession()
    await logSet({ sessionId: s, exerciseId: await exerciseId('Squat (Barbell)'), weight: 95, reps: 5, isWarmup: false })
    db.close()
    await db.open()
    expect((await getActiveSession())?.id).toBe(s)
    expect(await db.sets.where('sessionId').equals(s).count()).toBe(1)
  })

  it('edits a set and renumbers after deleting one', async () => {
    const bench = await exerciseId('Bench Press (Barbell)')
    const s = await startSession()
    const ids = [
      await logSet({ sessionId: s, exerciseId: bench, weight: 75, reps: 7, isWarmup: false }),
      await logSet({ sessionId: s, exerciseId: bench, weight: 75, reps: 7, isWarmup: false }),
      await logSet({ sessionId: s, exerciseId: bench, weight: 75, reps: 6, isWarmup: false }),
    ]
    await updateSet(ids[2]!, { reps: 5, weight: 72.5 })
    await deleteSet(ids[0]!)
    const left = await db.sets.where('sessionId').equals(s).sortBy('order')
    expect(left.map((x) => [x.order, x.weight, x.reps])).toEqual([
      [0, 75, 7],
      [1, 72.5, 5],
    ])
    // The next logged set continues the numbering.
    await logSet({ sessionId: s, exerciseId: bench, weight: 70, reps: 8, isWarmup: false })
    expect((await db.sets.where('sessionId').equals(s).sortBy('order')).map((x) => x.order)).toEqual([0, 1, 2])
  })
})

describe('previous performance', () => {
  it('returns the latest other session’s working sets, skipping warm-ups and the current session', async () => {
    const bench = await exerciseId('Bench Press (Barbell)')
    const old = await startSession(undefined, 100)
    await logSet({ sessionId: old, exerciseId: bench, weight: 70, reps: 8, isWarmup: false }, 110)
    await finishSession(old)
    const last = await startSession(undefined, 200)
    await logSet({ sessionId: last, exerciseId: bench, weight: 40, reps: 10, isWarmup: true }, 205)
    await logSet({ sessionId: last, exerciseId: bench, weight: 80, reps: 8, isWarmup: false }, 210)
    await logSet({ sessionId: last, exerciseId: bench, weight: 80, reps: 7, isWarmup: false }, 220)
    await finishSession(last)
    const now = await startSession(undefined, 300)
    await logSet({ sessionId: now, exerciseId: bench, weight: 85, reps: 5, isWarmup: false }, 310)

    expect(await getPreviousPerformance(bench, now)).toEqual({
      sessionId: last,
      startedAt: 200,
      sets: [
        { weight: 80, reps: 8 },
        { weight: 80, reps: 7 },
      ],
    })
  })

  it('is null for an exercise never done', async () => {
    expect(await getPreviousPerformance(await exerciseId('Deadlift (Barbell)'), 1)).toBeNull()
  })

  it('knows when each day was last trained', async () => {
    const [a, b] = [await dayId('Upper A'), await dayId('Lower A')]
    await finishSession(await startSession(a, 100))
    await finishSession(await startSession(b, 200))
    await finishSession(await startSession(a, 300))
    const last = await getLastTrainedByDay()
    expect(last.get(a)).toBe(300)
    expect(last.get(b)).toBe(200)
  })
})

describe('session view', () => {
  it('loads the day plan, sets, names and history', async () => {
    const upperA = await dayId('Upper A')
    const pullUp = await exerciseId('Pull Up')
    const prev = await startSession(upperA, 100)
    await logSet({ sessionId: prev, exerciseId: pullUp, weight: 0, reps: 4, isWarmup: false }, 110)
    await finishSession(prev)

    const s = await startSession(upperA, 200)
    const adhoc = await exerciseId('Deadlift (Barbell)')
    const view = await getSessionView(s, [adhoc])
    expect(view?.day?.name).toBe('Upper A')
    expect(view?.program?.name).toBe('Upper/Lower')
    expect(view?.plan).toHaveLength(8)
    expect(view?.plan[0]).toMatchObject({ name: 'Bench Press (Barbell)', targetSets: 4, targetReps: '6-7', targetWeight: 75 })
    expect(view?.exercises.get(adhoc)?.name).toBe('Deadlift (Barbell)')
    expect(view?.previous.get(pullUp)?.sets).toEqual([{ weight: 0, reps: 4 }])
  })

  it('still works for an empty session or after its day was deleted', async () => {
    const s = await startSession()
    expect((await getSessionView(s))?.plan).toEqual([])
    expect(await getSessionView(999)).toBeNull()
  })
})
