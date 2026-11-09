import { describe, expect, it } from 'vitest'
import { backupReminder, DEFAULT_SETTINGS, parseSettings } from './settings'

describe('parseSettings', () => {
  it('returns defaults for nothing or junk', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('[1,2]')).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS).toEqual({ unit: 'kg', defaultRestSeconds: 120, timerSound: false })
  })

  it('keeps valid values', () => {
    expect(parseSettings(JSON.stringify({ unit: 'lb', defaultRestSeconds: 90, timerSound: true, lastBackupAt: 123 }))).toEqual({
      unit: 'lb',
      defaultRestSeconds: 90,
      timerSound: true,
      lastBackupAt: 123,
    })
  })

  it('drops invalid values field by field', () => {
    expect(parseSettings(JSON.stringify({ unit: 'stone', defaultRestSeconds: 5, timerSound: 'yes', lastBackupAt: 'x' }))).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(JSON.stringify({ defaultRestSeconds: 601 })).defaultRestSeconds).toBe(120)
    expect(parseSettings(JSON.stringify({ defaultRestSeconds: 92.5 })).defaultRestSeconds).toBe(120)
  })

  it('keeps your AI question (capped in length) and drops a non-string', () => {
    expect(parseSettings(JSON.stringify({ aiQuestion: 'How is my squat?' })).aiQuestion).toBe('How is my squat?')
    expect(parseSettings(JSON.stringify({ aiQuestion: 'x'.repeat(5000) })).aiQuestion).toHaveLength(2000)
    expect(parseSettings(JSON.stringify({ aiQuestion: 42 })).aiQuestion).toBeUndefined()
  })
})

describe('backupReminder', () => {
  const day = 24 * 3600_000
  const now = 100 * day
  it('stays quiet until there are workouts', () => expect(backupReminder(undefined, false, now)).toBe(false))
  it('reminds when there has never been a backup', () => expect(backupReminder(undefined, true, now)).toEqual({ days: null }))
  it('reminds from 14 days on', () => {
    expect(backupReminder(now - 13.9 * day, true, now)).toBe(false)
    expect(backupReminder(now - 14 * day, true, now)).toEqual({ days: 14 })
    expect(backupReminder(now - 30.5 * day, true, now)).toEqual({ days: 30 })
  })
})
