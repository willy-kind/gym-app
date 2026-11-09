/**
 * Reading a Strong app CSV export (Settings → Export data in Strong).
 * Pure: the caller reads the file and writes to the database (db/strongImport.ts).
 *
 * Format (one row per set, plus "Rest Timer" rows carrying the rest in Seconds):
 * Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE
 * 2026-11-07 07:30:35,"Upper A",1h 57m,"Incline Curl (Dumbbell)",1,10.0,10.0,0,0.0,
 */
import { KG_PER_LB, type WeightUnit } from './units'

/** Minimal RFC 4180 CSV: quoted fields, "" escapes, CRLF/LF, optional BOM. Delimiter , or ; (from the header). */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text // byte-order mark
  const firstLine = src.slice(0, src.search(/\r?\n|$/))
  const delimiter = !firstLine.includes(',') && firstLine.includes(';') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

export interface StrongSet {
  exercise: string
  isWarmup: boolean
  /** In kg. */
  weight: number
  reps: number
  /** Rest after this set from Strong's "Rest Timer" row, in seconds. */
  restAfter?: number
}

export interface StrongWorkout {
  name: string
  startedAt: number
  durationMs?: number
  /** In the order they appear in the file. */
  sets: StrongSet[]
}

export interface StrongParse {
  workouts: StrongWorkout[]
  /** Distance/time-only rows (cardio) and rows with no reps, which the app can't store. */
  skipped: number
}

export class StrongFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StrongFormatError'
  }
}

const REQUIRED = ['Date', 'Workout Name', 'Exercise Name', 'Set Order', 'Weight', 'Reps'] as const

/** "2026-11-07 07:30:35" (local time) → timestamp, or null. */
export function parseStrongDate(text: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(text.trim())
  if (!m) return null
  const d = new Date(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +(m[6] ?? 0))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

/** "1h 57m", "52m", "2h", "45s" → ms, or undefined. */
export function parseStrongDuration(text: string): number | undefined {
  const t = text.trim()
  if (!t) return undefined
  const part = (unit: string) => Number(new RegExp(`(\\d+)\\s*${unit}`).exec(t)?.[1] ?? 0)
  const ms = (part('h') * 3600 + part('m') * 60 + part('s')) * 1000
  return ms > 0 ? ms : undefined
}

const num = (text: string | undefined): number => {
  const n = Number((text ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * Turns a Strong CSV into workouts. Weights are taken as `unit` and stored in kg.
 * Throws StrongFormatError when the file isn't a Strong export.
 */
export function parseStrongCsv(text: string, unit: WeightUnit = 'kg'): StrongParse {
  const rows = parseCsv(text)
  const header = rows[0]?.map((h) => h.trim())
  if (!header) throw new StrongFormatError('This file is empty.')
  const missing = REQUIRED.filter((c) => !header.includes(c))
  if (missing.length > 0) throw new StrongFormatError(`This isn’t a Strong export (missing columns: ${missing.join(', ')}).`)
  const col = (name: string) => header.indexOf(name)
  const iDate = col('Date')
  const iName = col('Workout Name')
  const iDuration = col('Duration')
  const iExercise = col('Exercise Name')
  const iOrder = col('Set Order')
  const iWeight = col('Weight')
  const iReps = col('Reps')
  const iSeconds = col('Seconds')
  const toKg = (w: number) => (unit === 'kg' ? w : Math.round(w * KG_PER_LB * 1000) / 1000)

  const byKey = new Map<string, StrongWorkout>()
  let skipped = 0
  for (const r of rows.slice(1)) {
    const startedAt = parseStrongDate(r[iDate] ?? '')
    const exercise = (r[iExercise] ?? '').trim()
    if (startedAt === null || !exercise) {
      skipped++
      continue
    }
    const name = (r[iName] ?? '').trim() || 'Workout'
    const key = `${startedAt}|${name}`
    let w = byKey.get(key)
    if (!w) {
      w = { name, startedAt, durationMs: iDuration >= 0 ? parseStrongDuration(r[iDuration] ?? '') : undefined, sets: [] }
      byKey.set(key, w)
    }

    const order = (r[iOrder] ?? '').trim()
    if (/^rest timer$/i.test(order)) {
      const last = w.sets.at(-1)
      const seconds = iSeconds >= 0 ? Math.round(num(r[iSeconds])) : 0
      if (last && last.exercise === exercise && seconds > 0) last.restAfter = seconds
      continue
    }
    const reps = Math.round(num(r[iReps]))
    if (reps <= 0) {
      // Cardio (distance/time) or an empty set: nothing the app can store.
      skipped++
      continue
    }
    w.sets.push({ exercise, isWarmup: /^w$/i.test(order), weight: Math.max(0, toKg(num(r[iWeight]))), reps })
  }
  const workouts = [...byKey.values()].filter((w) => w.sets.length > 0).sort((a, b) => a.startedAt - b.startedAt)
  return { workouts, skipped }
}

/** Time from the workout start to the first set, and between sets with no Strong rest recorded. */
export const DEFAULT_SET_GAP_S = 60

/**
 * When each set was done, rebuilt from the workout start and Strong's rest timers
 * (the export has no per-set times): each set follows the previous one by its rest,
 * or by DEFAULT_SET_GAP_S when none was recorded.
 */
export function setTimes(w: StrongWorkout): number[] {
  let t = w.startedAt
  return w.sets.map((_, i) => {
    const previous = w.sets[i - 1]
    t += (previous?.restAfter ?? DEFAULT_SET_GAP_S) * 1000
    return t
  })
}

/** The note an imported workout gets: "Strong: Upper A". */
export function strongNote(w: StrongWorkout): string {
  return `Strong: ${w.name}`
}
