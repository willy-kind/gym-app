import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, parseSettings } from './settings'

describe('parseSettings', () => {
  it('returns defaults for nothing or junk', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('[1,2]')).toEqual(DEFAULT_SETTINGS)
  })
  it('keeps valid values and drops invalid ones', () => {
    expect(parseSettings(JSON.stringify({ lastBackupAt: 123 }))).toEqual({ lastBackupAt: 123 })
    expect(parseSettings(JSON.stringify({ lastBackupAt: 'yesterday' }))).toEqual({})
  })
})
