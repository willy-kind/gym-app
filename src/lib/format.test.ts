import { describe, expect, it } from 'vitest'
import { formatWeight } from './format'

describe('formatWeight', () => {
  it('shows 0 as BW', () => expect(formatWeight(0)).toBe('BW'))
  it('drops trailing zeros', () => {
    expect(formatWeight(75)).toBe('75 kg')
    expect(formatWeight(22.5)).toBe('22.5 kg')
    expect(formatWeight(61.25)).toBe('61.25 kg')
  })
  it('rounds float noise', () => expect(formatWeight(0.1 + 0.2)).toBe('0.3 kg'))
})
