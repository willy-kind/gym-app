/** App preferences. Kept on the device (not in backups): they describe this phone, not your training. */

export interface Settings {
  /** When a backup was last exported from this phone. */
  lastBackupAt?: number
}

export const DEFAULT_SETTINGS: Settings = {}

/** Reads stored settings, ignoring anything malformed and filling defaults. */
export function parseSettings(json: string | null): Settings {
  let raw: unknown
  try {
    raw = json ? JSON.parse(json) : {}
  } catch {
    raw = {}
  }
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const s: Settings = { ...DEFAULT_SETTINGS }
  if (typeof r.lastBackupAt === 'number' && Number.isFinite(r.lastBackupAt)) s.lastBackupAt = r.lastBackupAt
  return s
}
