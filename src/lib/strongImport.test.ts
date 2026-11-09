import { describe, expect, it } from 'vitest'
import { parseCsv, parseStrongCsv, parseStrongDate, parseStrongDuration, setTimes, strongNote, StrongFormatError } from './strongImport'

const HEADER = 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE'
// The user's own export, trimmed.
const SAMPLE = `${HEADER}
2026-11-07 07:30:35,"Upper A",1h 57m,"Triceps Pushdown (Cable - Straight Bar)",2,32.5,10.0,0,0.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Triceps Pushdown (Cable - Straight Bar)",Rest Timer,0,0.0,0,90.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Triceps Pushdown (Cable - Straight Bar)",3,32.5,8.0,0,0.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Triceps Pushdown (Cable - Straight Bar)",Rest Timer,0,0.0,0,90.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Incline Curl (Dumbbell)",1,10.0,10.0,0,0.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Incline Curl (Dumbbell)",Rest Timer,0,0.0,0,90.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Incline Curl (Dumbbell)",2,10.0,10.0,0,0.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Incline Curl (Dumbbell)",Rest Timer,0,0.0,0,90.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Incline Curl (Dumbbell)",3,10.0,7.0,0,0.0,
2026-11-07 07:30:35,"Upper A",1h 57m,"Incline Curl (Dumbbell)",Rest Timer,0,0.0,0,90.0,
`

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas inside quotes, CRLF and a BOM', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ])
  })
  it('uses ; when the header has no commas, and drops blank lines', () => {
    expect(parseCsv('a;b\n1;2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('Strong dates and durations', () => {
  it('reads local date-times and "1h 57m" durations', () => {
    expect(parseStrongDate('2026-11-07 07:30:35')).toBe(new Date(2026, 10, 7, 7, 30, 35).getTime())
    expect(parseStrongDate('7 Nov')).toBeNull()
    expect(parseStrongDuration('1h 57m')).toBe(117 * 60_000)
    expect(parseStrongDuration('52m')).toBe(52 * 60_000)
    expect(parseStrongDuration('')).toBeUndefined()
  })
})

describe('parseStrongCsv', () => {
  it('reads the sample: one workout, sets in order, rest timers attached', () => {
    const { workouts, skipped } = parseStrongCsv(SAMPLE)
    expect(skipped).toBe(0)
    expect(workouts).toHaveLength(1)
    const w = workouts[0]!
    expect(w).toMatchObject({ name: 'Upper A', startedAt: new Date(2026, 10, 7, 7, 30, 35).getTime(), durationMs: 117 * 60_000 })
    expect(w.sets.map((s) => [s.exercise.split(' ')[0], s.weight, s.reps, s.isWarmup, s.restAfter])).toEqual([
      ['Triceps', 32.5, 10, false, 90],
      ['Triceps', 32.5, 8, false, 90],
      ['Incline', 10, 10, false, 90],
      ['Incline', 10, 10, false, 90],
      ['Incline', 10, 7, false, 90],
    ])
    expect(strongNote(w)).toBe('Strong: Upper A')
  })

  it('marks W as warm-up, skips cardio and empty rows, and splits workouts', () => {
    const csv = `${HEADER}
2026-01-01 10:00:00,"Legs",1h,"Squat (Barbell)",W,60,5,0,0,
2026-01-01 10:00:00,"Legs",1h,"Squat (Barbell)",1,100,5,0,0,8
2026-01-01 10:00:00,"Legs",1h,"Running",1,0,0,5000,1500,
2026-01-03 10:00:00,"Push",45m,"Bench Press (Barbell)",1,80,6,0,0,
`
    const { workouts, skipped } = parseStrongCsv(csv)
    expect(skipped).toBe(1)
    expect(workouts.map((w) => w.name)).toEqual(['Legs', 'Push'])
    expect(workouts[0]!.sets.map((s) => s.isWarmup)).toEqual([true, false])
  })

  it('converts lb to kg', () => {
    const { workouts } = parseStrongCsv(`${HEADER}\n2026-01-01 10:00:00,"A",1h,"Bench Press (Barbell)",1,135,5,0,0,\n`, 'lb')
    expect(workouts[0]!.sets[0]!.weight).toBe(61.235)
  })

  it('rejects files that are not a Strong export', () => {
    expect(() => parseStrongCsv('name,age\nx,1\n')).toThrow(StrongFormatError)
    expect(() => parseStrongCsv('')).toThrow(/empty/)
  })
})

describe('setTimes', () => {
  it('lays sets out from the start using the rest timers, 60 s otherwise', () => {
    const w = parseStrongCsv(SAMPLE).workouts[0]!
    const t = setTimes(w).map((x) => (x - w.startedAt) / 1000)
    expect(t).toEqual([60, 150, 240, 330, 420])
  })
})
