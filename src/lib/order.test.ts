import { describe, expect, it } from 'vitest'
import { moveItem, orderUpdates } from './order'

describe('moveItem', () => {
  const abc = ['a', 'b', 'c']
  it('moves up and down', () => {
    expect(moveItem(abc, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(abc, 1, 1)).toEqual(['a', 'c', 'b'])
  })
  it('clamps at the ends', () => {
    expect(moveItem(abc, 0, -1)).toEqual(abc)
    expect(moveItem(abc, 2, 5)).toEqual(abc)
  })
  it('ignores an out-of-range index and never mutates', () => {
    expect(moveItem(abc, 7, 1)).toEqual(abc)
    moveItem(abc, 0, 1)
    expect(abc).toEqual(['a', 'b', 'c'])
  })
})

describe('orderUpdates', () => {
  it('renumbers 0..n-1 and only returns changed rows', () => {
    const rows = [
      { id: 10, order: 0 },
      { id: 30, order: 2 },
      { id: 20, order: 1 },
    ]
    expect(orderUpdates(rows)).toEqual([
      { id: 30, order: 1 },
      { id: 20, order: 2 },
    ])
  })
  it('closes gaps left by deletions', () => {
    expect(orderUpdates([{ id: 1, order: 0 }, { id: 3, order: 2 }])).toEqual([{ id: 3, order: 1 }])
  })
})
