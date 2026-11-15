/**
 * Single-program file: one program with its days and targets, exercises named
 * rather than referenced by id, so it can be imported into any copy of the app
 * (another phone, or after a reset) alongside what is already there.
 * Pure: no database access here.
 */
import { BACKUP_APP } from './backup'

export const PROGRAM_FILE_KIND = 'program'
/** Bump when the layout changes, and teach parseProgramFile to read older ones. */
export const PROGRAM_FILE_FORMAT = 1
const MAX_PROGRAM_BYTES = 2 * 1024 * 1024

export interface ProgramFileExercise {
  name: string
  muscleGroup?: string
  notes?: string
  targetSets: number
  targetReps: string
  /** kg; 0 = bodyweight */
  targetWeight?: number
  restSeconds: number
}

export interface ProgramFileDay {
  name: string
  exercises: ProgramFileExercise[]
}

export interface ProgramExport {
  name: string
  notes?: string
  days: ProgramFileDay[]
}

export interface ProgramFile {
  app: typeof BACKUP_APP
  kind: typeof PROGRAM_FILE_KIND
  format: number
  exportedAt: string
  program: ProgramExport
}

export function createProgramFile(program: ProgramExport, now: number): ProgramFile {
  return { app: BACKUP_APP, kind: PROGRAM_FILE_KIND, format: PROGRAM_FILE_FORMAT, exportedAt: new Date(now).toISOString(), program }
}

export function serializeProgramFile(file: ProgramFile): string {
  return JSON.stringify(file, null, 2)
}

/** "program-upper-lower.json" */
export function programFileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `program-${slug || 'export'}.json`
}

/** "Upper/Lower", or "Upper/Lower (2)" etc. if that name is taken (ignoring case). */
export function uniqueProgramName(name: string, taken: readonly string[]): string {
  const norm = (s: string) => s.trim().toLocaleLowerCase()
  const used = new Set(taken.map(norm))
  if (!used.has(norm(name))) return name
  for (let n = 2; ; n++) {
    const candidate = `${name} (${n})`
    if (!used.has(norm(candidate))) return candidate
  }
}

// ---------- validation ----------

class Invalid extends Error {}

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)

function reader(row: Raw, where: string) {
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
  const str = (key: string): string => {
    const v = row[key]
    if (typeof v !== 'string' || v.trim() === '') return fail(key, 'non-empty text')
    return v.trim()
  }
  const optStr = (key: string): string | undefined => {
    const v = row[key]
    if (v === undefined || v === null) return undefined
    if (typeof v !== 'string') return fail(key, 'text')
    return v
  }
  const optNum = (key: string, opts: { int?: boolean; min?: number } = {}) => (row[key] === undefined || row[key] === null ? undefined : num(key, opts))
  const list = (key: string): Raw[] => {
    const v = row[key]
    if (!Array.isArray(v)) return fail(key, 'a list')
    return v.map((item, i) => {
      if (!isObj(item)) throw new Invalid(`${where}.${key}[${i}] is not an object`)
      return item
    })
  }
  return { num, str, optStr, optNum, list }
}

/** Drops undefined keys so imported rows look exactly like ones the app writes. */
function clean<T extends object>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)) as T
}

export type ParseProgramResult = { ok: true; file: ProgramFile } | { ok: false; error: string }

/** Parses and fully checks a program file. Unknown fields are dropped. */
export function parseProgramFile(text: string): ParseProgramResult {
  if (text.length > MAX_PROGRAM_BYTES) return { ok: false, error: 'The file is too large to be a program from this app.' }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON, so it can’t be a program from this app.' }
  }
  if (!isObj(json) || json.app !== BACKUP_APP) return { ok: false, error: 'This isn’t a program file from this app.' }
  if (json.kind !== PROGRAM_FILE_KIND) {
    if (isObj(json.data)) return { ok: false, error: 'This is a full backup, not a program. Restore it under Settings → Backup.' }
    return { ok: false, error: 'This isn’t a program file from this app.' }
  }
  if (typeof json.format !== 'number' || json.format < 1) return { ok: false, error: 'The program file has no valid format version.' }
  if (json.format > PROGRAM_FILE_FORMAT) return { ok: false, error: 'This program was exported by a newer version of the app. Update the app first (close and reopen it), then try again.' }
  if (!isObj(json.program)) return { ok: false, error: 'The file has no program in it.' }

  try {
    const p = reader(json.program, 'program')
    const days = p.list('days').map((d, i) => {
      const where = `day ${i + 1}`
      const r = reader(d, where)
      return {
        name: r.str('name'),
        exercises: r.list('exercises').map((e, j) => {
          const x = reader(e, `${where}, exercise ${j + 1}`)
          return clean({
            name: x.str('name'),
            muscleGroup: x.optStr('muscleGroup'),
            notes: x.optStr('notes'),
            targetSets: x.num('targetSets', { int: true, min: 1 }),
            targetReps: x.str('targetReps'),
            targetWeight: x.optNum('targetWeight', { min: 0 }),
            restSeconds: x.num('restSeconds', { int: true, min: 0 }),
          })
        }),
      }
    })
    const program = clean({ name: p.str('name'), notes: p.optStr('notes'), days })
    return {
      ok: true,
      file: {
        app: BACKUP_APP,
        kind: PROGRAM_FILE_KIND,
        format: PROGRAM_FILE_FORMAT,
        exportedAt: typeof json.exportedAt === 'string' ? json.exportedAt : '',
        program,
      },
    }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `The program file is damaged and wasn’t imported (${e.message}).` }
    throw e
  }
}
