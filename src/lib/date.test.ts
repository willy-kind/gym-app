import { describe, expect, it } from 'vitest'
import { formatClock, formatDay, formatDuration } from './date'

describe('formatDay', () => {
  const now = new Date(2026, 10, 9, 8, 0).getTime() // Mon 9 Nov 2026, 08:00 local
  it('says Today and Yesterday by calendar day, not 24 h', () => {
    expect(formatDay(new Date(2026, 10, 9, 0, 5).getTime(), now)).toBe('Today')
    expect(formatDay(new Date(2026, 10, 8, 23, 30).getTime(), now)).toBe('Yesterday')
  })
  it('shows weekday and date this year, and the year otherwise', () => {
    expect(formatDay(new Date(2026, 10, 3, 18, 0).getTime(), now)).toBe('Tue 3 Nov')
    expect(formatDay(new Date(2025, 11, 30, 18, 0).getTime(), now)).toBe('30 Dec 2025')
  })
})

describe('formatClock', () => {
  it('uses 24-hour time', () => expect(formatClock(new Date(2026, 0, 1, 18, 5).getTime())).toBe('18:05'))
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(59_000)).toBe('0 min')
    expect(formatDuration(42 * 60_000)).toBe('42 min')
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min')
  })
  it('never goes negative', () => expect(formatDuration(-1000)).toBe('0 min'))
})
