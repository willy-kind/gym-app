import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { exportAll, restoreAll } from './backup'
import { finishSession, getActiveSession, logSet, startSession } from './sessions'
import { createProgram } from './programs'
import { createBackup, parseBackup, serializeBackup, type BackupData } from '../lib/backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const exerciseId = async (name: string) => (await db.exercises.where('name').equals(name).first())!.id!

async function snapshot() {
  return exportAll()
}

describe('backup and restore', () => {
  it('round-trips every table through a file, keeping ids', async () => {
    const bench = await exerciseId('Bench Press (Barbell)')
    const done = await startSession(1, 1000)
    await logSet({ sessionId: done, exerciseId: bench, weight: 75, reps: 7, isWarmup: false }, 1100)
    await db.sessions.update(done, { notes: 'good day' })
    await finishSession(done, 5000)
    const running = await startSession(undefined, 6000)
    await logSet({ sessionId: running, exerciseId: bench, weight: 40, reps: 10, isWarmup: true }, 6100)

    const before = await snapshot()
    const file = serializeBackup(createBackup(before, Date.now()))

    // Wipe and change things, then restore.
    await db.delete()
    await db.open()
    await createProgram('Something else')

    const parsed = parseBackup(file)
    if (!parsed.ok) throw new Error(parsed.error)
    await restoreAll(parsed.backup.data)

    expect(await snapshot()).toEqual(before)
    expect((await getActiveSession())?.id).toBe(running)
  })

  it('keeps handing out new ids above the restored ones', async () => {
    const data = await snapshot()
    data.exercises.push({ id: 500, name: 'High id' })
    await restoreAll(data)
    const next = (await db.exercises.add({ name: 'New' })) as number
    expect(next).toBeGreaterThan(500)
  })

  it('changes nothing if the restore fails part-way', async () => {
    const before = await snapshot()
    const bad = structuredClone(before) as BackupData
    // Two rows with the same id make bulkAdd fail after the tables were cleared.
    bad.sets = [
      { id: 1, sessionId: 1, exerciseId: 1, order: 0, weight: 1, reps: 1, isWarmup: false, completedAt: 1 },
      { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 1, reps: 1, isWarmup: false, completedAt: 2 },
    ]
    bad.sessions = [{ id: 1, startedAt: 0, finishedAt: 1 }]
    await expect(restoreAll(bad)).rejects.toThrow()
    expect(await snapshot()).toEqual(before)
  })

  it('restores an empty backup to an empty app', async () => {
    await restoreAll({ exercises: [], programs: [], programDays: [], programDayExercises: [], sessions: [], sets: [] })
    expect(await db.programs.count()).toBe(0)
    expect(await db.exercises.count()).toBe(0)
  })
})
