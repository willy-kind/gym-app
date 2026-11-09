import { describe, expect, it } from 'vitest'
import { epley, filterRange, isBodyweightOnly, progressPoints, summarize, type ProgressSet } from './progress'

const s = (sessionId: number, date: number, weight: number, reps: number, isWarmup = false): ProgressSet => ({ sessionId, date, weight, reps, isWarmup })

describe('epley', () => {
  it('applies w × (1 + reps/30)', () => {
    expect(epley(100, 5)).toBe(116.7)
    expect(epley(80, 8)).toBe(101.3)
    expect(epley(100, 0)).toBe(100)
    expect(epley(0, 10)).toBe(0)
  })
})

describe('progressPoints', () => {
  const sets = [
    s(2, 200, 80, 8),
    s(2, 200, 85, 5),
    s(2, 200, 85, 6),
    s(2, 200, 40, 10, true),
    s(1, 100, 75, 7),
    s(1, 100, 75, 7),
    s(3, 300, 20, 10, true),
  ]
  const points = progressPoints(sets)

  it('makes one point per session, oldest first, skipping warm-up-only sessions', () => {
    expect(points.map((p) => p.sessionId)).toEqual([1, 2])
  })

  it('picks the heaviest set as the top set, more reps breaking a tie', () => {
    expect(points[1]).toMatchObject({ topWeight: 85, topReps: 6 })
  })

  it('takes the best e1RM from any set, not just the top set', () => {
    // 80×8 → 101.3, 85×5 → 99.2, 85×6 → 102.0
    expect(points[1]!.e1rm).toBe(102)
    const lighterWins = progressPoints([s(1, 1, 100, 1), s(1, 1, 90, 6)])
    expect(lighterWins[0]!.e1rm).toBe(108) // 90×6 = 108 > 100×1 = 103.3
  })

  it('sums volume and reps over working sets only', () => {
    expect(points[1]).toMatchObject({ volume: 80 * 8 + 85 * 5 + 85 * 6, totalReps: 19, bestReps: 8 })
    expect(points[0]).toMatchObject({ volume: 1050, totalReps: 14 })
  })
})

describe('isBodyweightOnly', () => {
  it('is true only when no set ever had extra load', () => {
    expect(isBodyweightOnly(progressPoints([s(1, 1, 0, 5), s(2, 2, 0, 6)]))).toBe(true)
    expect(isBodyweightOnly(progressPoints([s(1, 1, 0, 5), s(2, 2, 5, 4)]))).toBe(false)
    expect(isBodyweightOnly([])).toBe(false)
  })
})

describe('filterRange', () => {
  const day = 24 * 3600_000
  const now = 1000 * day
  const pts = [{ date: now - 400 * day }, { date: now - 100 * day }, { date: now - 10 * day }]
  it('keeps points inside the range', () => {
    expect(filterRange(pts, '3m', now)).toHaveLength(1)
    expect(filterRange(pts, '6m', now)).toHaveLength(2)
    expect(filterRange(pts, '1y', now)).toHaveLength(2)
    expect(filterRange(pts, 'all', now)).toHaveLength(3)
  })
})

describe('summarize', () => {
  it('reports latest, best with its date, and change over the range', () => {
    expect(summarize([{ date: 1, value: 100 }, { date: 2, value: 110 }, { date: 3, value: 105 }])).toEqual({
      latest: 105,
      best: 110,
      bestDate: 2,
      change: 5,
    })
  })
  it('has no change for a single point and nothing for none', () => {
    expect(summarize([{ date: 1, value: 50 }])?.change).toBeNull()
    expect(summarize([])).toBeNull()
  })
})
