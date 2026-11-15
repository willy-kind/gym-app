import { describe, expect, it } from 'vitest'
import { createProgramFile, parseProgramFile, programFileName, serializeProgramFile, uniqueProgramName, type ProgramExport } from './programFile'

const sample = (): ProgramExport => ({
  name: 'Upper/Lower',
  notes: 'Run 8 weeks',
  days: [
    {
      name: 'Upper A',
      exercises: [
        { name: 'Bench Press (Barbell)', targetSets: 4, targetReps: '6-7', targetWeight: 75, restSeconds: 180 },
        { name: 'Pull Up', muscleGroup: 'Back', notes: 'wide', targetSets: 6, targetReps: '3-4', targetWeight: 0, restSeconds: 120 },
      ],
    },
    { name: 'Rest-ish', exercises: [] },
  ],
})

const text = (program: unknown, extra: object = {}) => JSON.stringify({ app: 'gym-app', kind: 'program', format: 1, exportedAt: 'x', program, ...extra })
const errorOf = (t: string) => {
  const r = parseProgramFile(t)
  return r.ok ? null : r.error
}

describe('program file', () => {
  it('parses exactly what it serialises', () => {
    const file = createProgramFile(sample(), Date.UTC(2026, 10, 15))
    expect(parseProgramFile(serializeProgramFile(file))).toEqual({ ok: true, file })
  })

  it('drops unknown fields and nulls, trims names', () => {
    const p = sample() as unknown as { name: string; days: { name: string; exercises: Record<string, unknown>[] }[]; extra?: number }
    p.name = '  Upper/Lower '
    p.extra = 1
    p.days[0]!.exercises[0]!.id = 7
    p.days[0]!.exercises[0]!.notes = null
    const r = parseProgramFile(text(p))
    if (!r.ok) throw new Error(r.error)
    expect(r.file.program.name).toBe('Upper/Lower')
    expect(r.file.program).not.toHaveProperty('extra')
    expect(r.file.program.days[0]!.exercises[0]).toEqual(sample().days[0]!.exercises[0])
  })

  it('rejects files that are not programs from this app', () => {
    expect(errorOf('nope')).toMatch(/valid JSON/)
    expect(errorOf('{"app":"other"}')).toMatch(/isn’t a program/)
    expect(errorOf(JSON.stringify({ app: 'gym-app', format: 1, data: {} }))).toMatch(/full backup/)
    expect(errorOf(text(sample(), { format: 2 }))).toMatch(/newer version/)
    expect(errorOf(text(sample(), { format: 'one' }))).toMatch(/format version/)
    expect(errorOf(text(undefined))).toMatch(/no program/)
  })

  it('names the broken field', () => {
    const p = sample()
    p.days[0]!.exercises[1]!.targetSets = 0
    expect(errorOf(text(p))).toMatch(/day 1, exercise 2: "targetSets" should be at least 1/)
    expect(errorOf(text({ ...sample(), name: ' ' }))).toMatch(/"name" should be non-empty text/)
    expect(errorOf(text({ ...sample(), days: {} }))).toMatch(/"days" should be a list/)
    expect(errorOf(text({ ...sample(), days: [{ name: 'A', exercises: [{ name: 'X', targetSets: 3, targetReps: '5', restSeconds: -1 }] }] }))).toMatch(/restSeconds/)
  })
})

describe('programFileName', () => {
  it('makes a safe file name', () => {
    expect(programFileName('Upper/Lower')).toBe('program-upper-lower.json')
    expect(programFileName('Push Pull Legs — Été')).toBe('program-push-pull-legs-ete.json')
    expect(programFileName('???')).toBe('program-export.json')
  })
})

describe('uniqueProgramName', () => {
  it('keeps a free name and numbers a taken one', () => {
    expect(uniqueProgramName('PPL', ['Upper/Lower'])).toBe('PPL')
    expect(uniqueProgramName('PPL', ['ppl'])).toBe('PPL (2)')
    expect(uniqueProgramName('PPL', ['PPL', 'PPL (2)'])).toBe('PPL (3)')
  })
})
