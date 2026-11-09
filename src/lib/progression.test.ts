import { describe, expect, it } from 'vitest'
import { findPRs, suggestNextWeight, type PRCandidate } from './progression'

const sets = (weight: number, ...reps: number[]) => reps.map((r) => ({ weight, reps: r }))

describe('suggestNextWeight', () => {
  const bench = { targetSets: 4, targetReps: '6-7' }

  it('goes up 2.5 kg when every planned set hit the top of the range', () => {
    expect(suggestNextWeight(sets(75, 7, 7, 7, 7), bench)).toEqual({ weight: 77.5, reps: 7, sets: 4 })
    expect(suggestNextWeight(sets(75, 8, 7, 9, 7), bench)?.weight).toBe(77.5)
  })

  it('works for a fixed rep target', () => {
    expect(suggestNextWeight(sets(100, 5, 5, 5), { targetSets: 3, targetReps: '5' })?.weight).toBe(102.5)
  })

  it('only looks at the planned number of sets; extra sets don’t block it', () => {
    expect(suggestNextWeight([...sets(75, 7, 7, 7, 7), { weight: 75, reps: 4 }], bench)?.weight).toBe(77.5)
  })

  it('stays put when a set fell short, sets are missing, or loads were mixed', () => {
    expect(suggestNextWeight(sets(75, 7, 7, 6, 7), bench)).toBeNull()
    expect(suggestNextWeight(sets(75, 7, 7, 7), bench)).toBeNull()
    expect(suggestNextWeight([...sets(75, 7, 7), ...sets(77.5, 7, 7)], bench)).toBeNull()
    expect(suggestNextWeight([], bench)).toBeNull()
  })

  it('has nothing to suggest for pure bodyweight, unplanned or unparseable targets', () => {
    expect(suggestNextWeight(sets(0, 4, 4, 4, 4, 4, 4), { targetSets: 6, targetReps: '3-4' })).toBeNull()
    expect(suggestNextWeight(sets(75, 7, 7, 7, 7), undefined)).toBeNull()
    expect(suggestNextWeight(sets(75, 7, 7, 7, 7), { targetSets: 4, targetReps: 'lots' })).toBeNull()
  })

  it('adds load to a weighted bodyweight exercise', () => {
    expect(suggestNextWeight(sets(5, 4, 4), { targetSets: 2, targetReps: '3-4' })?.weight).toBe(7.5)
  })

  it('steps to the next 5 lb mark in lb, stored in kg', () => {
    // 75 kg shows as 165.3 lb → next is 170 lb.
    const s = suggestNextWeight(sets(75, 7, 7, 7, 7), bench, 'lb')
    expect(s?.weight).toBeCloseTo(77.111, 3)
  })
})

describe('findPRs', () => {
  let id = 0
  const set = (weight: number, reps: number, completedAt: number, isWarmup = false): PRCandidate => ({ id: ++id, weight, reps, completedAt, isWarmup })

  it('the first set is only a baseline', () => {
    expect(findPRs([set(75, 6, 1)]).size).toBe(0)
  })

  it('flags a higher e1RM or a heavier weight, not a repeat', () => {
    const a = set(75, 6, 1)
    const same = set(75, 6, 2)
    const moreReps = set(75, 7, 3)
    const heavierFewer = set(80, 1, 4) // e1RM 82.7 < 92.5, but heaviest ever
    const lighter = set(70, 12, 5) // e1RM 98 > 92.5
    const prs = findPRs([lighter, heavierFewer, moreReps, same, a]) // order doesn't matter
    expect([...prs].sort((x, y) => x - y)).toEqual([moreReps.id, heavierFewer.id, lighter.id])
  })

  it('ignores warm-ups both as PRs and as the bar to beat', () => {
    const w = set(100, 5, 1, true)
    const a = set(75, 6, 2)
    const b = set(77.5, 6, 3)
    expect([...findPRs([w, a, b])]).toEqual([b.id])
  })

  it('counts more reps at bodyweight', () => {
    const a = set(0, 4, 1)
    const b = set(0, 4, 2)
    const c = set(0, 5, 3)
    expect([...findPRs([a, b, c])]).toEqual([c.id])
  })

  it('first time adding load to a bodyweight exercise is a PR', () => {
    const a = set(0, 4, 1)
    const b = set(5, 3, 2)
    expect([...findPRs([a, b])]).toEqual([b.id])
  })
})
