import { describe, expect, it } from 'vitest'
import { buildSeedRows } from './seedRows'
import { seedPrograms } from './seed'

describe('buildSeedRows', () => {
  const rows = buildSeedRows(seedPrograms)

  it('creates one exercise per unique name', () => {
    const names = rows.exercises.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names.filter((n) => n === 'Pull Up')).toHaveLength(1)
    expect(names).toContain('Pull Up (Negative)')
  })

  it('links every day exercise to an existing day and exercise', () => {
    const dayIds = new Set(rows.programDays.map((d) => d.id))
    const exIds = new Set(rows.exercises.map((e) => e.id))
    for (const pde of rows.programDayExercises) {
      expect(dayIds.has(pde.programDayId)).toBe(true)
      expect(exIds.has(pde.exerciseId)).toBe(true)
    }
    expect(rows.programDayExercises).toHaveLength(26)
  })

  it('keeps day and exercise order and targets', () => {
    expect(rows.programDays.map((d) => [d.name, d.order])).toEqual([
      ['Upper A', 0],
      ['Lower A', 1],
      ['Upper B', 2],
      ['Lower B', 3],
    ])
    const pullUpId = rows.exercises.find((e) => e.name === 'Pull Up')!.id
    const pullUps = rows.programDayExercises.filter((p) => p.exerciseId === pullUpId)
    expect(pullUps.map((p) => [p.programDayId, p.targetSets, p.targetWeight])).toEqual([
      [1, 6, 0],
      [3, 4, 0],
    ])
  })
})
