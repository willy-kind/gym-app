import { describe, expect, it } from 'vitest'
import { formatTargetSummary, formatVolume, formatWeight } from './format'

describe('formatWeight', () => {
  it('shows 0 as BW', () => expect(formatWeight(0)).toBe('BW'))
  it('drops trailing zeros', () => {
    expect(formatWeight(75)).toBe('75 kg')
    expect(formatWeight(22.5)).toBe('22.5 kg')
    expect(formatWeight(61.25)).toBe('61.25 kg')
  })
  it('rounds float noise', () => expect(formatWeight(0.1 + 0.2)).toBe('0.3 kg'))
})

describe('formatTargetSummary', () => {
  it('summarises sets, reps, weight and rest', () => {
    expect(formatTargetSummary({ targetSets: 4, targetReps: '6-7', targetWeight: 75, restSeconds: 180 })).toBe('4 × 6-7 · 75 kg · 3:00 rest')
  })
  it('shows bodyweight as BW, including a missing weight', () => {
    expect(formatTargetSummary({ targetSets: 6, targetReps: '3-4', targetWeight: 0, restSeconds: 120 })).toBe('6 × 3-4 · BW · 2:00 rest')
    expect(formatTargetSummary({ targetSets: 3, targetReps: '10', restSeconds: 90 })).toBe('3 × 10 · BW · 1:30 rest')
  })
})

describe('formatVolume', () => {
  it('rounds and groups thousands', () => {
    expect(formatVolume(12339.6)).toBe('12,340 kg')
    expect(formatVolume(0)).toBe('0 kg')
  })
})
