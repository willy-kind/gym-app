import { describe, expect, it } from 'vitest'
import {
  buildSessionExercises,
  formatSetsSummary,
  formatSetWeight,
  isBodyweightExercise,
  nextIncomplete,
  prefillSet,
  suggestNextDay,
  type LoggedSet,
  type PlanEntry,
} from './session'

const plan: PlanEntry[] = [
  { exerciseId: 1, name: 'Bench', targetSets: 2, targetReps: '6-7', targetWeight: 75, restSeconds: 180 },
  { exerciseId: 2, name: 'Row', targetSets: 2, targetReps: '8', targetWeight: 70, restSeconds: 120 },
]
let nextId = 1
const set = (exerciseId: number, order: number, completedAt: number, extra: Partial<LoggedSet> = {}): LoggedSet => ({
  id: nextId++,
  exerciseId,
  order,
  completedAt,
  weight: 80,
  reps: 8,
  isWarmup: false,
  ...extra,
})
const names = (id: number) => `Ex ${id}`

describe('buildSessionExercises', () => {
  it('lists the plan in order with no sets', () => {
    const list = buildSessionExercises(plan, [], [], names)
    expect(list.map((e) => [e.name, e.workingSets, e.done])).toEqual([
      ['Bench', 0, false],
      ['Row', 0, false],
    ])
  })

  it('groups sets by exercise in order, ignoring warm-ups for the target', () => {
    const sets = [set(1, 1, 30), set(1, 0, 20, { isWarmup: true }), set(1, 2, 40)]
    const [bench] = buildSessionExercises(plan, sets, [], names)
    expect(bench?.sets.map((s) => s.order)).toEqual([0, 1, 2])
    expect(bench?.workingSets).toBe(2)
    expect(bench?.done).toBe(true)
  })

  it('appends unplanned exercises by first logged time, then ad-hoc ones without sets', () => {
    const sets = [set(9, 0, 50), set(8, 0, 10)]
    const list = buildSessionExercises(plan, sets, [{ exerciseId: 7, name: 'Curl' }, { exerciseId: 9, name: 'dup' }], names)
    expect(list.map((e) => e.name)).toEqual(['Bench', 'Row', 'Ex 8', 'Ex 9', 'Curl'])
    expect(list[4]?.plan).toBeUndefined()
  })

  it('shows an exercise planned twice only once', () => {
    expect(buildSessionExercises([...plan, plan[0]!], [], [], names)).toHaveLength(2)
  })
})

describe('nextIncomplete', () => {
  it('finds the next unfinished exercise, wrapping around', () => {
    const list = buildSessionExercises(plan, [set(1, 0, 1), set(1, 1, 2)], [], names)
    expect(nextIncomplete(list, 0)).toBe(1)
    const rowDone = buildSessionExercises(plan, [set(2, 0, 1), set(2, 1, 2)], [], names)
    expect(nextIncomplete(rowDone, 1)).toBe(0)
  })
  it('counts an ad-hoc exercise as incomplete until it has a set, and returns -1 when all done', () => {
    const sets = [set(1, 0, 1), set(1, 1, 2), set(2, 0, 3), set(2, 1, 4)]
    expect(nextIncomplete(buildSessionExercises(plan, sets, [{ exerciseId: 5, name: 'X' }], names))).toBe(2)
    expect(nextIncomplete(buildSessionExercises(plan, sets, [], names))).toBe(-1)
  })
})

describe('prefillSet', () => {
  const previous = [
    { weight: 80, reps: 8 },
    { weight: 80, reps: 8 },
    { weight: 80, reps: 7 },
  ]

  it('copies the matching set from last session', () => {
    expect(prefillSet({ previous, current: [] })).toEqual({ weight: 80, reps: 8 })
    expect(prefillSet({ previous, current: [previous[0]!, previous[1]!] })).toEqual({ weight: 80, reps: 7 })
  })

  it('repeats last session’s final set for extra sets', () => {
    expect(prefillSet({ previous, current: [...previous] })).toEqual({ weight: 80, reps: 7 })
  })

  it('keeps a load you changed this session', () => {
    expect(prefillSet({ previous, current: [{ weight: 82.5, reps: 8 }] })).toEqual({ weight: 82.5, reps: 8 })
  })

  it('falls back to this session, then targets, then defaults', () => {
    expect(prefillSet({ previous: [], current: [{ weight: 60, reps: 10 }] })).toEqual({ weight: 60, reps: 10 })
    expect(prefillSet({ previous: [], current: [], targetWeight: 75, targetReps: '6-7' })).toEqual({ weight: 75, reps: 6 })
    expect(prefillSet({ previous: [], current: [] })).toEqual({ weight: 0, reps: 8 })
  })
})

describe('formatSetWeight / formatSetsSummary', () => {
  it('formats loads and bodyweight', () => {
    expect(formatSetWeight(80, false)).toBe('80 kg')
    expect(formatSetWeight(0, true)).toBe('BW')
    expect(formatSetWeight(10, true)).toBe('BW + 10 kg')
    expect(formatSetWeight(22.5, false)).toBe('22.5 kg')
  })

  it('writes the "Last time" summary', () => {
    expect(formatSetsSummary([{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 7 }], false)).toBe('80 kg × 8, 8, 7')
    expect(formatSetsSummary([{ weight: 80, reps: 8 }, { weight: 85, reps: 6 }, { weight: 85, reps: 5 }], false)).toBe('80 kg × 8 · 85 kg × 6, 5')
    expect(formatSetsSummary([{ weight: 0, reps: 4 }, { weight: 0, reps: 3 }], true)).toBe('BW × 4, 3')
    expect(formatSetsSummary([], false)).toBeNull()
  })
})

describe('suggestNextDay', () => {
  const days = [{ id: 1 }, { id: 2 }, { id: 3 }]
  it('picks the day after the last one trained, wrapping', () => {
    expect(suggestNextDay(days, 1)?.id).toBe(2)
    expect(suggestNextDay(days, 3)?.id).toBe(1)
  })
  it('starts at the first day without history', () => {
    expect(suggestNextDay(days, undefined)?.id).toBe(1)
    expect(suggestNextDay(days, 99)?.id).toBe(1)
    expect(suggestNextDay([], 1)).toBeUndefined()
  })
})

describe('isBodyweightExercise', () => {
  it('uses the plan when the exercise is planned', () => {
    expect(isBodyweightExercise(0, true, [])).toBe(true)
    expect(isBodyweightExercise(undefined, true, [])).toBe(true)
    expect(isBodyweightExercise(75, true, [{ weight: 0, reps: 5 }])).toBe(false)
  })
  it('uses history for unplanned exercises', () => {
    expect(isBodyweightExercise(undefined, false, [{ weight: 0, reps: 5 }])).toBe(true)
    expect(isBodyweightExercise(undefined, false, [{ weight: 0, reps: 5 }, { weight: 10, reps: 3 }])).toBe(false)
    expect(isBodyweightExercise(undefined, false, [])).toBe(false)
  })
})

describe('lb display', () => {
  it('formats sets and summaries in lb, grouping by the stored kg', () => {
    expect(formatSetWeight(100, false, 'lb')).toBe('220.5 lb')
    expect(formatSetWeight(10, true, 'lb')).toBe('BW + 22 lb')
    expect(formatSetsSummary([{ weight: 60, reps: 8 }, { weight: 60, reps: 7 }], false, 'lb')).toBe('132.3 lb × 8, 7')
  })
})

describe('prefillSet with a progression suggestion', () => {
  const previous = [
    { weight: 75, reps: 7 },
    { weight: 75, reps: 7 },
  ]
  it('uses the suggested weight for the first set and carries it on', () => {
    expect(prefillSet({ previous, current: [], suggestedWeight: 77.5 })).toEqual({ weight: 77.5, reps: 7 })
    expect(prefillSet({ previous, current: [{ weight: 77.5, reps: 6 }], suggestedWeight: 77.5 })).toEqual({ weight: 77.5, reps: 7 })
  })
  it('goes back to last time once you log at the old weight', () => {
    expect(prefillSet({ previous, current: [{ weight: 75, reps: 7 }], suggestedWeight: 77.5 })).toEqual({ weight: 75, reps: 7 })
  })
})
