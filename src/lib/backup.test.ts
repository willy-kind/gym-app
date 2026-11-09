import { describe, expect, it } from 'vitest'
import { backupCounts, backupFileName, createBackup, parseBackup, serializeBackup, type BackupData } from './backup'

const sample = (): BackupData => ({
  exercises: [
    { id: 1, name: 'Bench Press (Barbell)' },
    { id: 2, name: 'Pull Up', muscleGroup: 'Back', notes: 'grip wide' },
  ],
  programs: [{ id: 1, name: 'Upper/Lower', archived: false }],
  programDays: [{ id: 1, programId: 1, name: 'Upper A', order: 0 }],
  programDayExercises: [
    { id: 1, programDayId: 1, exerciseId: 1, order: 0, targetSets: 4, targetReps: '6-7', targetWeight: 75, restSeconds: 180 },
    { id: 2, programDayId: 1, exerciseId: 2, order: 1, targetSets: 6, targetReps: '3-4', targetWeight: 0, restSeconds: 120 },
  ],
  sessions: [
    { id: 1, programDayId: 1, startedAt: 1000, finishedAt: 5000, notes: 'good' },
    { id: 2, programDayId: 99, startedAt: 6000, finishedAt: 7000 },
    { id: 3, startedAt: 8000 },
  ],
  sets: [
    { id: 1, sessionId: 1, exerciseId: 1, order: 0, weight: 75, reps: 7, isWarmup: false, completedAt: 1100 },
    { id: 2, sessionId: 3, exerciseId: 2, order: 0, weight: 0, reps: 4, isWarmup: false, completedAt: 8100 },
  ],
})

const text = (data: unknown, extra: object = {}) => JSON.stringify({ app: 'gym-app', format: 1, exportedAt: '2026-11-09T10:00:00.000Z', data, ...extra })
const errorOf = (t: string) => {
  const r = parseBackup(t)
  return r.ok ? null : r.error
}

describe('backup round trip', () => {
  it('parses exactly what it serialises', () => {
    const file = createBackup(sample(), Date.UTC(2026, 10, 9, 10))
    const r = parseBackup(serializeBackup(file))
    expect(r).toEqual({ ok: true, backup: file })
  })

  it('keeps sessions whose day was deleted, and the one in progress', () => {
    const r = parseBackup(text(sample()))
    expect(r.ok && r.backup.data.sessions.map((s) => s.id)).toEqual([1, 2, 3])
  })

  it('drops unknown fields and nulls', () => {
    const d = sample() as unknown as { exercises: Record<string, unknown>[] }
    d.exercises[0] = { id: 1, name: 'Bench', hacked: '<script>', notes: null }
    const r = parseBackup(text(d))
    expect(r.ok && r.backup.data.exercises[0]).toEqual({ id: 1, name: 'Bench' })
  })

  it('counts and names files', () => {
    expect(backupCounts(sample())).toEqual({ programs: 1, exercises: 2, sessions: 3, sets: 2 })
    expect(backupFileName(new Date(2026, 10, 9, 23, 30).getTime())).toBe('gym-backup-2026-11-09.json')
  })
})

describe('rejecting bad files', () => {
  it('rejects non-JSON, other apps, missing or newer formats', () => {
    expect(errorOf('nope')).toMatch(/valid JSON/)
    expect(errorOf(JSON.stringify({ app: 'other', format: 1, data: {} }))).toMatch(/isn’t a backup from this app/)
    expect(errorOf(JSON.stringify({ app: 'gym-app', data: sample() }))).toMatch(/format version/)
    expect(errorOf(text(sample(), { format: 2 }))).toMatch(/newer version/)
    expect(errorOf(JSON.stringify({ app: 'gym-app', format: 1 }))).toMatch(/no data/)
  })

  it('rejects a missing table', () => {
    const d: Partial<BackupData> = sample()
    delete d.sets
    expect(errorOf(text(d))).toMatch(/"sets" is missing/)
  })

  it('rejects wrong field types with the row named', () => {
    const d = sample() as unknown as { sets: Record<string, unknown>[] }
    d.sets[1]!.weight = '80'
    expect(errorOf(text(d))).toMatch(/sets\[1\]: "weight" should be a number/)
  })

  it('rejects negative, fractional and empty values', () => {
    const neg = sample()
    neg.sets[0]!.weight = -5
    expect(errorOf(text(neg))).toMatch(/at least 0/)
    const frac = sample()
    frac.sets[0]!.reps = 7.5
    expect(errorOf(text(frac))).toMatch(/whole number/)
    const empty = sample()
    empty.exercises[0]!.name = '  '
    expect(errorOf(text(empty))).toMatch(/non-empty/)
  })

  it('rejects duplicate ids', () => {
    const d = sample()
    d.exercises[1]!.id = 1
    expect(errorOf(text(d))).toMatch(/exercises: id 1 appears twice/)
  })

  it('rejects references to rows that are not there', () => {
    const a = sample()
    a.sets[0]!.exerciseId = 42
    expect(errorOf(text(a))).toMatch(/sets\[0\]: exercise 42 doesn’t exist/)
    const b = sample()
    b.programDays[0]!.programId = 7
    expect(errorOf(text(b))).toMatch(/programDays\[0\]: program 7/)
    const c = sample()
    c.sets[0]!.sessionId = 9
    expect(errorOf(text(c))).toMatch(/session 9/)
  })

  it('rejects impossible sessions', () => {
    const a = sample()
    a.sessions[0]!.finishedAt = 500
    expect(errorOf(text(a))).toMatch(/finishes before it starts/)
    const b = sample()
    b.sessions[1] = { id: 2, startedAt: 6000 }
    expect(errorOf(text(b))).toMatch(/more than one workout is in progress/)
  })

  it('rejects oversized input before parsing', () => {
    expect(errorOf(' '.repeat(50 * 1024 * 1024 + 1))).toMatch(/too large/)
  })
})
