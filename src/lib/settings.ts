/** App preferences. Kept on the device (not in backups): they describe this phone, not your training. */
import { DEFAULT_REST_SECONDS, MAX_REST_SECONDS } from './targets'
import type { WeightUnit } from './units'
import { MAX_AI_QUESTION_LENGTH } from './aiExport'

export interface Settings {
  unit: WeightUnit
  /** Rest for exercises with no rest target, and the starting rest for newly added program exercises. */
  defaultRestSeconds: number
  /** Short beep when the rest timer finishes (app in the foreground only). */
  timerSound: boolean
  /** Stop the screen dimming and locking while the app is open. */
  keepAwake: boolean
  /** When a backup was last exported from this phone. */
  lastBackupAt?: number
  /** Your own question at the top of "Share with AI" text; absent or blank means the default. */
  aiQuestion?: string
}

export const DEFAULT_SETTINGS: Settings = { unit: 'kg', defaultRestSeconds: DEFAULT_REST_SECONDS, timerSound: true, keepAwake: true }

export const REST_STEP_SECONDS = 15
export const MIN_DEFAULT_REST_SECONDS = 15

/** Reads stored settings, ignoring anything malformed and filling defaults. */
export function parseSettings(json: string | null): Settings {
  let raw: unknown
  try {
    raw = json ? JSON.parse(json) : {}
  } catch {
    raw = {}
  }
  const r = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const s: Settings = { ...DEFAULT_SETTINGS }
  if (r.unit === 'kg' || r.unit === 'lb') s.unit = r.unit
  if (
    typeof r.defaultRestSeconds === 'number' &&
    Number.isInteger(r.defaultRestSeconds) &&
    r.defaultRestSeconds >= MIN_DEFAULT_REST_SECONDS &&
    r.defaultRestSeconds <= MAX_REST_SECONDS
  ) {
    s.defaultRestSeconds = r.defaultRestSeconds
  }
  if (typeof r.timerSound === 'boolean') s.timerSound = r.timerSound
  if (typeof r.keepAwake === 'boolean') s.keepAwake = r.keepAwake
  if (typeof r.lastBackupAt === 'number' && Number.isFinite(r.lastBackupAt)) s.lastBackupAt = r.lastBackupAt
  if (typeof r.aiQuestion === 'string') s.aiQuestion = r.aiQuestion.slice(0, MAX_AI_QUESTION_LENGTH)
  return s
}

export const BACKUP_REMINDER_DAYS = 14

/**
 * Whether to nag about backing up: only once there are workouts to lose,
 * and the last backup is missing or older than 14 days. Returns the age in
 * whole days (null if never backed up), or false when no reminder is due.
 */
export function backupReminder(lastBackupAt: number | undefined, hasWorkouts: boolean, now: number): { days: number | null } | false {
  if (!hasWorkouts) return false
  if (lastBackupAt === undefined) return { days: null }
  const days = Math.floor((now - lastBackupAt) / (24 * 3600_000))
  return days >= BACKUP_REMINDER_DAYS ? { days } : false
}
