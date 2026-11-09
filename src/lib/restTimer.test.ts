import { describe, expect, it } from 'vitest'
import { adjustRestTimer, createRestTimer, isDone, overtimeSeconds, parseRestTimer, progress, remainingSeconds } from './restTimer'

const meta = { sessionId: 1, exerciseName: 'Bench' }
const t0 = 1_000_000

describe('rest timer', () => {
  const timer = createRestTimer(90, t0, meta)

  it('stores an end time', () => {
    expect(timer).toEqual({ startedAt: t0, endsAt: t0 + 90_000, ...meta })
  })

  it('computes remaining time from the clock, rounding up', () => {
    expect(remainingSeconds(timer, t0)).toBe(90)
    expect(remainingSeconds(timer, t0 + 500)).toBe(90)
    expect(remainingSeconds(timer, t0 + 89_001)).toBe(1)
    expect(remainingSeconds(timer, t0 + 90_000)).toBe(0)
  })

  it('is correct after a long time in the background', () => {
    // e.g. phone locked for 5 minutes
    expect(isDone(timer, t0 + 300_000)).toBe(true)
    expect(remainingSeconds(timer, t0 + 300_000)).toBe(0)
    expect(overtimeSeconds(timer, t0 + 300_000)).toBe(210)
  })

  it('counts overtime only once done', () => {
    expect(overtimeSeconds(timer, t0 + 10_000)).toBe(0)
    expect(overtimeSeconds(timer, t0 + 92_500)).toBe(2)
  })

  it('adds and removes 15 s while running', () => {
    expect(adjustRestTimer(timer, 15, t0 + 10_000).endsAt).toBe(t0 + 105_000)
    expect(adjustRestTimer(timer, -15, t0 + 10_000).endsAt).toBe(t0 + 75_000)
  })

  it('never ends in the past when removing time', () => {
    expect(adjustRestTimer(timer, -15, t0 + 80_000).endsAt).toBe(t0 + 80_000)
  })

  it('restarts from now when adding to a finished timer; minus does nothing', () => {
    const later = t0 + 120_000
    expect(adjustRestTimer(timer, 15, later).endsAt).toBe(later + 15_000)
    expect(adjustRestTimer(timer, -15, later).endsAt).toBe(later)
  })

  it('reports progress from 1 down to 0', () => {
    expect(progress(timer, t0)).toBe(1)
    expect(progress(timer, t0 + 45_000)).toBe(0.5)
    expect(progress(timer, t0 + 200_000)).toBe(0)
    expect(progress(createRestTimer(0, t0, meta), t0)).toBe(0)
  })

  it('round-trips through storage and rejects junk', () => {
    expect(parseRestTimer(JSON.stringify(timer))).toEqual(timer)
    expect(parseRestTimer(null)).toBeNull()
    expect(parseRestTimer('not json')).toBeNull()
    expect(parseRestTimer('{"endsAt":5}')).toBeNull()
    expect(parseRestTimer(JSON.stringify({ ...timer, endsAt: t0 - 1 }))).toBeNull()
  })
})
