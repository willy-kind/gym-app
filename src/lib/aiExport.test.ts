import { describe, expect, it } from 'vitest'
import { formatShareDate, restBetween, shareTextForWorkout, shareTextForWorkouts, type ShareWorkout } from './aiExport'

const at = (h: number, m: number, s = 0, day = 6) => new Date(2026, 10, day, h, m, s).getTime()

const upperA: ShareWorkout = {
  title: 'Upper A',
  programName: 'Upper/Lower',
  startedAt: at(18, 5),
  finishedAt: at(18, 57),
  notes: 'Felt strong',
  exercises: [
    {
      name: 'Bench Press (Barbell)',
      bodyweight: false,
      target: { targetSets: 4, targetReps: '6-7', targetWeight: 75, restSeconds: 180 },
      sets: [
        { weight: 40, reps: 8, isWarmup: true, completedAt: at(18, 8), pr: false },
        { weight: 77.5, reps: 6, isWarmup: false, completedAt: at(18, 10), pr: true },
        { weight: 77.5, reps: 6, isWarmup: false, completedAt: at(18, 13, 5), pr: false },
      ],
      lastTime: { date: at(18, 0, 0, 2), sets: [{ weight: 75, reps: 7 }, { weight: 75, reps: 7 }] },
    },
    {
      name: 'Pull Up',
      bodyweight: true,
      target: { targetSets: 6, targetReps: '3-4', restSeconds: 120 },
      sets: [
        { weight: 0, reps: 4, isWarmup: false, completedAt: at(18, 20), pr: false },
        { weight: 5, reps: 3, isWarmup: false, completedAt: at(18, 20, 1), pr: false }, // added afterwards: no rest shown
      ],
    },
    {
      name: 'Squat (Barbell)',
      bodyweight: false,
      sets: [{ weight: 100, reps: 5, isWarmup: false, completedAt: at(18, 40), pr: false }],
    },
  ],
}

describe('restBetween', () => {
  it('counts real rests and ignores tiny or huge gaps', () => {
    expect(restBetween(0, 185_000)).toBe(185)
    expect(restBetween(0, 1_000)).toBeNull()
    expect(restBetween(0, 31 * 60_000)).toBeNull()
  })
})

describe('shareTextForWorkout', () => {
  const text = shareTextForWorkout(upperA, 'kg')

  it('starts with the question and the workout header', () => {
    expect(text.startsWith('I track my strength training')).toBe(true)
    expect(text).toContain('Weights are in kg.')
    expect(text).toContain(`Workout: Upper A (Upper/Lower) — ${formatShareDate(upperA.startedAt)}, 18:05–18:57 (52 min)`)
    expect(text).toContain('Notes: Felt strong')
  })

  it('lists target, warm-ups, numbered sets with rest and PRs, e1RM and last time', () => {
    expect(text).toContain('Bench Press (Barbell) — target 4 × 6-7 @ 75 kg, rest 3:00')
    expect(text).toContain('  W  40 kg × 8\n')
    expect(text).toContain('  1. 77.5 kg × 6 · rest 2:00 (PR)')
    expect(text).toContain('  2. 77.5 kg × 6 · rest 3:05')
    expect(text).toContain('  Best e1RM: 93 kg')
    expect(text).toContain(`  Last time (${formatShareDate(at(18, 0, 0, 2))}): 75 kg × 7, 7`)
  })

  it('handles bodyweight, sets without a real rest, and unplanned exercises', () => {
    expect(text).toContain('Pull Up — target 6 × 3-4 @ BW, rest 2:00')
    expect(text).toContain('  1. BW × 4\n  2. BW + 5 kg × 3\n')
    expect(text).toContain('Squat (Barbell) — not in the plan')
    expect(text).toContain('Totals: 5 working sets · 1,445 kg volume')
  })

  it('uses lb when asked', () => {
    const lb = shareTextForWorkout(upperA, 'lb')
    expect(lb).toContain('Weights are in lb.')
    expect(lb).toContain('170.9 lb × 6 · rest 2:00 (PR)')
  })
})

describe('shareTextForWorkouts', () => {
  const later: ShareWorkout = { ...upperA, startedAt: at(18, 5, 0, 9), finishedAt: at(18, 50, 0, 9), notes: undefined }
  const text = shareTextForWorkouts([later, upperA], 'kg')

  it('lists program targets once, then the workouts oldest first without per-workout targets', () => {
    expect(text.match(/Program targets \(current\):/g)).toHaveLength(1)
    expect(text.match(/ {2}Bench Press \(Barbell\): 4 × 6-7 @ 75 kg, rest 3:00/g)).toHaveLength(1)
    expect(text).toContain(`2 workouts, ${formatShareDate(upperA.startedAt)} to ${formatShareDate(later.startedAt)}, oldest first.`)
    expect(text.indexOf(formatShareDate(upperA.startedAt) + ', 18:05')).toBeLessThan(text.indexOf(formatShareDate(later.startedAt) + ', 18:05'))
    expect(text).not.toContain('— target')
    expect(text.match(/^---$/gm)).toHaveLength(2)
  })
})
