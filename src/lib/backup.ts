/**
 * Backup file format, and strict validation of a file before it may replace
 * the phone's data. Pure: no database access here.
 */
import type { Exercise, Program, ProgramDay, ProgramDayExercise, Session, WorkoutSet } from '../db/types'

export const BACKUP_APP = 'gym-app'
/** Bump when the file layout changes, and teach parseBackup to read older ones. */
export const BACKUP_FORMAT = 1
/** Refuse absurd files before parsing them. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024

type WithId<T> = T & { id: number }

export interface BackupData {
  exercises: WithId<Exercise>[]
  programs: WithId<Program>[]
  programDays: WithId<ProgramDay>[]
  programDayExercises: WithId<ProgramDayExercise>[]
  sessions: WithId<Session>[]
  sets: WithId<WorkoutSet>[]
}

export const TABLES = ['exercises', 'programs', 'programDays', 'programDayExercises', 'sessions', 'sets'] as const satisfies readonly (keyof BackupData)[]

export interface BackupFile {
  app: typeof BACKUP_APP
  format: number
  exportedAt: string
  data: BackupData
}

export function createBackup(data: BackupData, now: number): BackupFile {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date(now).toISOString(), data }
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file)
}

/** "gym-backup-2026-11-09.json" (local date). */
export function backupFileName(now: number): string {
  const d = new Date(now)
  const p = (n: number) => String(n).padStart(2, '0')
  return `gym-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`
}

export interface BackupCounts {
  programs: number
  exercises: number
  sessions: number
  sets: number
}

export function backupCounts(data: BackupData): BackupCounts {
  return { programs: data.programs.length, exercises: data.exercises.length, sessions: data.sessions.length, sets: data.sets.length }
}

// ---------- validation ----------

class Invalid extends Error {}

type Raw = Record<string, unknown>

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)

function field(row: Raw, where: string) {
  const fail = (key: string, want: string): never => {
    throw new Invalid(`${where}: "${key}" should be ${want}`)
  }
  const num = (key: string, opts: { int?: boolean; min?: number } = {}): number => {
    const v = row[key]
    if (typeof v !== 'number' || !Number.isFinite(v)) return fail(key, 'a number')
    if (opts.int && !Number.isInteger(v)) return fail(key, 'a whole number')
    if (opts.min !== undefined && v < opts.min) return fail(key, `at least ${opts.min}`)
    return v
  }
  return {
    id: () => num('id', { int: true, min: 1 }),
    num,
    optNum: (key: string, opts: { int?: boolean; min?: number } = {}) => (row[key] === undefined || row[key] === null ? undefined : num(key, opts)),
    str: (key: string, opts: { nonEmpty?: boolean } = {}): string => {
      const v = row[key]
      if (typeof v !== 'string') return fail(key, 'text')
      if (opts.nonEmpty && v.trim() === '') return fail(key, 'non-empty text')
      return v
    },
    optStr: (key: string): string | undefined => {
      const v = row[key]
      if (v === undefined || v === null) return undefined
      if (typeof v !== 'string') return fail(key, 'text')
      return v
    },
    bool: (key: string): boolean => {
      const v = row[key]
      if (typeof v !== 'boolean') return fail(key, 'true or false')
      return v
    },
  }
}

/** Drops undefined keys so restored rows look exactly like ones the app writes. */
function clean<T extends object>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)) as T
}

function rows<T>(data: Raw, table: string, read: (row: Raw, where: string) => T): T[] {
  const list = data[table]
  if (!Array.isArray(list)) throw new Invalid(`"${table}" is missing or not a list`)
  return list.map((row, i) => {
    const where = `${table}[${i}]`
    if (!isObj(row)) throw new Invalid(`${where} is not an object`)
    return clean(read(row, where) as object) as T
  })
}

function uniqueIds(table: string, list: { id: number }[]): Set<number> {
  const ids = new Set<number>()
  for (const r of list) {
    if (ids.has(r.id)) throw new Invalid(`${table}: id ${r.id} appears twice`)
    ids.add(r.id)
  }
  return ids
}

function mustExist(ids: Set<number>, id: number, where: string, what: string) {
  if (!ids.has(id)) throw new Invalid(`${where}: ${what} ${id} doesn’t exist in the backup`)
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

/**
 * Parses and fully checks a backup file: its marker and version, every
 * field of every row, unique ids, and that references point at rows that
 * exist. Unknown fields are dropped. Nothing is written anywhere.
 */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'The file is too large to be a backup from this app.' }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON, so it can’t be a backup from this app.' }
  }
  if (!isObj(json) || json.app !== BACKUP_APP) return { ok: false, error: 'This isn’t a backup from this app.' }
  if (typeof json.format !== 'number') return { ok: false, error: 'The backup has no format version.' }
  if (json.format > BACKUP_FORMAT) return { ok: false, error: 'This backup was made by a newer version of the app. Update the app first (close and reopen it), then try again.' }
  if (json.format < 1) return { ok: false, error: 'Unknown backup format.' }
  if (!isObj(json.data)) return { ok: false, error: 'The backup has no data.' }
  const exportedAt = typeof json.exportedAt === 'string' ? json.exportedAt : ''

  try {
    const d = json.data
    const exercises = rows(d, 'exercises', (r, w) => {
      const f = field(r, w)
      return { id: f.id(), name: f.str('name', { nonEmpty: true }), muscleGroup: f.optStr('muscleGroup'), notes: f.optStr('notes') }
    })
    const programs = rows(d, 'programs', (r, w) => {
      const f = field(r, w)
      return { id: f.id(), name: f.str('name', { nonEmpty: true }), notes: f.optStr('notes'), archived: f.bool('archived') }
    })
    const programDays = rows(d, 'programDays', (r, w) => {
      const f = field(r, w)
      return { id: f.id(), programId: f.num('programId', { int: true }), name: f.str('name', { nonEmpty: true }), order: f.num('order', { int: true, min: 0 }) }
    })
    const programDayExercises = rows(d, 'programDayExercises', (r, w) => {
      const f = field(r, w)
      return {
        id: f.id(),
        programDayId: f.num('programDayId', { int: true }),
        exerciseId: f.num('exerciseId', { int: true }),
        order: f.num('order', { int: true, min: 0 }),
        targetSets: f.num('targetSets', { int: true, min: 1 }),
        targetReps: f.str('targetReps', { nonEmpty: true }),
        targetWeight: f.optNum('targetWeight', { min: 0 }),
        restSeconds: f.num('restSeconds', { int: true, min: 0 }),
      }
    })
    const sessions = rows(d, 'sessions', (r, w) => {
      const f = field(r, w)
      const s = {
        id: f.id(),
        // May point at a day that has since been deleted; sessions are kept on purpose.
        programDayId: f.optNum('programDayId', { int: true }),
        startedAt: f.num('startedAt', { min: 0 }),
        finishedAt: f.optNum('finishedAt', { min: 0 }),
        notes: f.optStr('notes'),
      }
      if (s.finishedAt !== undefined && s.finishedAt < s.startedAt) throw new Invalid(`${w}: finishes before it starts`)
      return s
    })
    const sets = rows(d, 'sets', (r, w) => {
      const f = field(r, w)
      return {
        id: f.id(),
        sessionId: f.num('sessionId', { int: true }),
        exerciseId: f.num('exerciseId', { int: true }),
        order: f.num('order', { int: true, min: 0 }),
        weight: f.num('weight', { min: 0 }),
        reps: f.num('reps', { int: true, min: 0 }),
        isWarmup: f.bool('isWarmup'),
        completedAt: f.num('completedAt', { min: 0 }),
      }
    })

    const exerciseIds = uniqueIds('exercises', exercises)
    const programIds = uniqueIds('programs', programs)
    const dayIds = uniqueIds('programDays', programDays)
    uniqueIds('programDayExercises', programDayExercises)
    const sessionIds = uniqueIds('sessions', sessions)
    uniqueIds('sets', sets)

    programDays.forEach((x, i) => mustExist(programIds, x.programId, `programDays[${i}]`, 'program'))
    programDayExercises.forEach((x, i) => {
      mustExist(dayIds, x.programDayId, `programDayExercises[${i}]`, 'day')
      mustExist(exerciseIds, x.exerciseId, `programDayExercises[${i}]`, 'exercise')
    })
    sets.forEach((x, i) => {
      mustExist(sessionIds, x.sessionId, `sets[${i}]`, 'session')
      mustExist(exerciseIds, x.exerciseId, `sets[${i}]`, 'exercise')
    })
    if (sessions.filter((s) => s.finishedAt === undefined).length > 1) throw new Invalid('more than one workout is in progress')

    return {
      ok: true,
      backup: {
        app: BACKUP_APP,
        format: BACKUP_FORMAT,
        exportedAt,
        data: { exercises, programs, programDays, programDayExercises, sessions, sets } as BackupData,
      },
    }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `The backup is damaged and wasn’t restored (${e.message}).` }
    throw e
  }
}
