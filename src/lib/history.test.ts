import { describe, expect, it } from 'vitest'
import { fromDateTimeLocal, groupByMonth, sessionStats, toDateTimeLocal, validateSessionTimes } from './history'

describe('sessionStats', () => {
  it('counts working sets, exercises and volume, ignoring warm-ups', () => {
    expect(
      sessionStats([
        { exerciseId: 1, weight: 40, reps: 10, isWarmup: true },
        { exerciseId: 1, weight: 80, reps: 8, isWarmup: false },
        { exerciseId: 1, weight: 80, reps: 7, isWarmup: false },
        { exerciseId: 2, weight: 0, reps: 5, isWarmup: false },
        { exerciseId: 3, weight: 22.5, reps: 3, isWarmup: false },
      ]),
    ).toEqual({ workingSets: 4, exercises: 3, volume: 80 * 15 + 67.5 })
  })
  it('handles an empty session', () => expect(sessionStats([])).toEqual({ workingSets: 0, exercises: 0, volume: 0 }))
})

describe('groupByMonth', () => {
  it('groups newest-first items by month and keeps order', () => {
    const items = [new Date(2026, 10, 9), new Date(2026, 10, 2), new Date(2026, 9, 30), new Date(2025, 9, 1)].map((d) => d.getTime())
    const groups = groupByMonth(items, (t) => t)
    expect(groups.map((g) => [g.key, g.label, g.items.length])).toEqual([
      ['2026-11', 'November 2026', 2],
      ['2026-10', 'October 2026', 1],
      ['2025-10', 'October 2025', 1],
    ])
  })
})

describe('datetime-local conversion', () => {
  it('round-trips local time to the minute', () => {
    const t = new Date(2026, 10, 9, 18, 5).getTime()
    expect(toDateTimeLocal(t)).toBe('2026-11-09T18:05')
    expect(fromDateTimeLocal('2026-11-09T18:05')).toBe(t)
  })
  it('accepts seconds and rejects junk and impossible dates', () => {
    expect(fromDateTimeLocal('2026-11-09T18:05:30')).toBe(new Date(2026, 10, 9, 18, 5, 30).getTime())
    expect(fromDateTimeLocal('')).toBeNull()
    expect(fromDateTimeLocal('2026-11-09')).toBeNull()
    expect(fromDateTimeLocal('2026-02-31T10:00')).toBeNull()
  })
})

describe('validateSessionTimes', () => {
  const now = new Date(2026, 10, 9, 20, 0).getTime()
  const start = new Date(2026, 10, 9, 18, 0).getTime()
  it('accepts a normal workout', () => expect(validateSessionTimes(start, start + 3600_000, now)).toBeNull())
  it('rejects missing, reversed, too long and future times', () => {
    expect(validateSessionTimes(null, start, now)).toMatch(/start/)
    expect(validateSessionTimes(start, null, now)).toMatch(/finish/)
    expect(validateSessionTimes(start, start - 1, now)).toMatch(/after start/)
    expect(validateSessionTimes(start, start + 13 * 3600_000, now)).toMatch(/12 hours/)
    expect(validateSessionTimes(now + 60_000, now + 120_000, now)).toMatch(/future/)
  })
})
