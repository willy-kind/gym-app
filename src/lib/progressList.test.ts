import { describe, expect, it } from 'vitest'
import { arrangeProgress, parseProgressSelection } from './progressList'

const t = (id: number) => ({ exercise: { id } })
const ids = (xs: { exercise: { id: number } }[]) => xs.map((x) => x.exercise.id)

describe('arrangeProgress', () => {
  const trained = [t(3), t(1), t(2)]

  it('shows everything in the given order when not customised', () => {
    const r = arrangeProgress(trained, undefined)
    expect(ids(r.shown)).toEqual([3, 1, 2])
    expect(r.hidden).toEqual([])
  })

  it('shows only the chosen exercises in the chosen order', () => {
    const r = arrangeProgress(trained, [2, 3])
    expect(ids(r.shown)).toEqual([2, 3])
    expect(ids(r.hidden)).toEqual([1])
  })

  it('skips chosen ids without data and hides newly trained ones', () => {
    const r = arrangeProgress([...trained, t(9)], [99, 1])
    expect(ids(r.shown)).toEqual([1])
    expect(ids(r.hidden)).toEqual([3, 2, 9])
  })

  it('an empty choice shows nothing', () => {
    expect(arrangeProgress(trained, []).shown).toEqual([])
  })
})

describe('parseProgressSelection', () => {
  it('keeps unique positive whole numbers in order', () => {
    expect(parseProgressSelection([3, 1, 3, 0, -2, 1.5, '4', null, 2])).toEqual([3, 1, 2])
    expect(parseProgressSelection([])).toEqual([])
  })
  it('treats anything else as not customised', () => {
    expect(parseProgressSelection(undefined)).toBeUndefined()
    expect(parseProgressSelection('1,2')).toBeUndefined()
  })
})
