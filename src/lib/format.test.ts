import { describe, expect, it } from 'vitest'
import { formatAxisDate, formatAxisNumber, formatTargetSummary, formatVolume, formatWeight } from './format'

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

describe('axis formatting', () => {
  it('writes numbers in full under 10,000 and compact above', () => {
    expect(formatAxisNumber(82.5)).toBe('82.5')
    expect(formatAxisNumber(2500)).toBe('2,500')
    expect(formatAxisNumber(12_400)).toBe('12K')
  })
  it('writes short dates, with the year when the chart spans years', () => {
    const t = new Date(2026, 10, 3).getTime()
    expect(formatAxisDate(t, false)).toBe('3 Nov')
    expect(formatAxisDate(t, true)).toBe('Nov 26')
  })
})

describe('lb display', () => {
  it('converts weights, targets and volume', () => {
    expect(formatWeight(0, 'lb')).toBe('BW')
    expect(formatWeight(75, 'lb')).toBe('165.3 lb')
    expect(formatTargetSummary({ targetSets: 4, targetReps: '6-7', targetWeight: 75, restSeconds: 180 }, 'lb')).toBe('4 × 6-7 · 165.3 lb · 3:00 rest')
    expect(formatVolume(1000, 'lb')).toBe('2,205 lb')
  })
})
