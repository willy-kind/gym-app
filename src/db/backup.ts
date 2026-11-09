import { db } from './db'
import { TABLES, type BackupData } from '../lib/backup'

/** All data, read in one transaction so the snapshot is consistent. */
export async function exportAll(): Promise<BackupData> {
  return db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    const [exercises, programs, programDays, programDayExercises, sessions, sets] = await Promise.all(TABLES.map((t) => db.table(t).toArray()))
    return { exercises, programs, programDays, programDayExercises, sessions, sets } as BackupData
  })
}

/**
 * Replaces everything with the backup's data, keeping its ids, in one
 * transaction: if anything fails, nothing on the phone changes.
 * Validate with parseBackup first.
 */
export async function restoreAll(data: BackupData): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear()
    for (const t of TABLES) await db.table(t).bulkAdd(data[t])
  })
}
