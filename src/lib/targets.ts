/** Helpers for program targets: rep ranges, weights typed on an iOS keypad, rest times. */

export const DEFAULT_TARGET_SETS = 3
export const DEFAULT_TARGET_REPS = '8-10'
export const DEFAULT_REST_SECONDS = 120
export const MAX_SETS = 20
export const MAX_REPS = 100
export const MAX_REST_SECONDS = 600
export const MAX_NAME_LENGTH = 60

export interface RepTarget {
  min: number
  /** Equal to min for a fixed target like "5". */
  max: number
}

/** "8" → {8, 8}; "8-10" → {8, 10}. Returns null for anything else. */
export function parseRepTarget(text: string): RepTarget | null {
  const m = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(text)
  if (!m) return null
  const min = Number(m[1])
  const max = m[2] === undefined ? min : Number(m[2])
  if (min < 1 || max < min || max > MAX_REPS) return null
  return { min, max }
}

export function formatRepTarget({ min, max }: RepTarget): string {
  return max === min ? String(min) : `${min}-${max}`
}

/**
 * Parses a weight as typed on an iOS decimal keypad, which shows "," in
 * some regions. Empty means 0 (bodyweight). Returns null if invalid.
 */
export function parseWeight(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return 0
  if (!/^\d+(\.\d+)?$|^\d+\.$|^\.\d+$/.test(t)) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n > 1000) return null
  return Math.round(n * 100) / 100
}

/** 90 → "1:30", 180 → "3:00", 45 → "0:45". */
export function formatRest(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Trimmed, collapsed whitespace; null if empty or too long. */
export function cleanName(text: string): string | null {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t === '' || t.length > MAX_NAME_LENGTH) return null
  return t
}

/** Reps as typed on the numeric keypad: a whole number 1–100, else null. */
export function parseReps(text: string): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= 1 && n <= MAX_REPS ? n : null
}

/** Weight for an input box: bodyweight (0) is left empty so the "BW" placeholder shows. */
export function weightInputText(kg: number): string {
  return kg === 0 ? '' : String(kg)
}
