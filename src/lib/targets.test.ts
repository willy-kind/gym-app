import { describe, expect, it } from 'vitest'
import { clamp, cleanName, formatRepTarget, formatRest, MAX_NAME_LENGTH, parseRepTarget, parseWeight } from './targets'

describe('parseRepTarget / formatRepTarget', () => {
  it('parses fixed and ranged targets', () => {
    expect(parseRepTarget('5')).toEqual({ min: 5, max: 5 })
    expect(parseRepTarget('8-10')).toEqual({ min: 8, max: 10 })
    expect(parseRepTarget(' 6 - 7 ')).toEqual({ min: 6, max: 7 })
  })
  it('rejects junk, zero, reversed and huge ranges', () => {
    for (const bad of ['', 'x', '8-', '-8', '0', '10-8', '5-101', '8–10', '8.5']) expect(parseRepTarget(bad)).toBeNull()
  })
  it('formats back to the stored string', () => {
    expect(formatRepTarget({ min: 5, max: 5 })).toBe('5')
    expect(formatRepTarget({ min: 8, max: 10 })).toBe('8-10')
  })
  it('round-trips every target in the seed format', () => {
    for (const s of ['5', '6-7', '10-12', '15']) expect(formatRepTarget(parseRepTarget(s)!)).toBe(s)
  })
})

describe('parseWeight', () => {
  it('treats empty as bodyweight', () => expect(parseWeight('  ')).toBe(0))
  it('accepts dot and comma decimals', () => {
    expect(parseWeight('22.5')).toBe(22.5)
    expect(parseWeight('61,25')).toBe(61.25)
    expect(parseWeight('7.')).toBe(7)
    expect(parseWeight('.5')).toBe(0.5)
  })
  it('rounds to two decimals', () => expect(parseWeight('10.005')).toBe(10.01))
  it('rejects negatives, junk and absurd values', () => {
    for (const bad of ['-5', 'abc', '1.2.3', '1001', '5 kg']) expect(parseWeight(bad)).toBeNull()
  })
})

describe('formatRest', () => {
  it('formats m:ss', () => {
    expect(formatRest(0)).toBe('0:00')
    expect(formatRest(45)).toBe('0:45')
    expect(formatRest(90)).toBe('1:30')
    expect(formatRest(180)).toBe('3:00')
  })
  it('never goes negative', () => expect(formatRest(-5)).toBe('0:00'))
})

describe('clamp', () => {
  it('clamps both ends', () => {
    expect(clamp(0, 1, 20)).toBe(1)
    expect(clamp(25, 1, 20)).toBe(20)
    expect(clamp(5, 1, 20)).toBe(5)
  })
})

describe('cleanName', () => {
  it('trims and collapses whitespace', () => expect(cleanName('  Push   A ')).toBe('Push A'))
  it('rejects empty and too-long names', () => {
    expect(cleanName('   ')).toBeNull()
    expect(cleanName('x'.repeat(MAX_NAME_LENGTH + 1))).toBeNull()
  })
})
