import { describe, expect, it } from 'vitest'
import { filterByName, findByName } from './search'

const items = [{ name: 'Pull Up' }, { name: 'Bench Press (Barbell)' }, { name: 'Incline Bench Press (Barbell)' }, { name: 'Pull Up (Negative)' }]

describe('filterByName', () => {
  it('returns everything, sorted, for an empty query', () => {
    expect(filterByName(items, '  ').map((i) => i.name)).toEqual([
      'Bench Press (Barbell)',
      'Incline Bench Press (Barbell)',
      'Pull Up',
      'Pull Up (Negative)',
    ])
  })
  it('matches all words in any order, ignoring case', () => {
    expect(filterByName(items, 'barbell bench').map((i) => i.name)).toEqual(['Bench Press (Barbell)', 'Incline Bench Press (Barbell)'])
    expect(filterByName(items, 'PULL neg').map((i) => i.name)).toEqual(['Pull Up (Negative)'])
  })
  it('returns nothing when a word does not match', () => expect(filterByName(items, 'squat')).toEqual([]))
})

describe('findByName', () => {
  it('ignores case and extra whitespace', () => expect(findByName(items, '  pull   up ')?.name).toBe('Pull Up'))
  it('does not match partial names', () => expect(findByName(items, 'Pull')).toBeUndefined())
})
