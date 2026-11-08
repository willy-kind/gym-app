import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePrograms, ProgramsParseError, uniqueExerciseNames } from './parsePrograms'
import { renderSeedModule } from './seedSource'

const sample = `# Programs

Format: \`Exercise: sets x reps @ weight, rest seconds\`
- Weight is the starting weight in kg.
- \`BW\` = bodyweight.

## Program: Upper/Lower

### Upper A
- Bench Press (Barbell): 4 x 6-7 @ 75 kg, rest 180s
- Pull Up: 6 x 3-4 @ BW, rest 120s
- Triceps Pushdown (Cable - Straight Bar): 3 x 8-10 @ 32.5 kg, rest 90s

### Lower A
- Calf Press on Seated Leg Press: 3 x 15 @ 61.25 kg, rest 120s
- Pull Up: 1 x 5 @ BW, rest 60s
`

describe('parsePrograms', () => {
  it('parses programs, days and exercises', () => {
    const [program, ...rest] = parsePrograms(sample)
    expect(rest).toHaveLength(0)
    expect(program?.name).toBe('Upper/Lower')
    expect(program?.days.map((d) => d.name)).toEqual(['Upper A', 'Lower A'])
    expect(program?.days[0]?.exercises[0]).toEqual({
      name: 'Bench Press (Barbell)',
      targetSets: 4,
      targetReps: '6-7',
      targetWeight: 75,
      restSeconds: 180,
    })
  })

  it('treats BW as weight 0', () => {
    expect(parsePrograms(sample)[0]?.days[0]?.exercises[1]).toMatchObject({ name: 'Pull Up', targetWeight: 0 })
  })

  it('handles decimal weights, single rep targets and names with dashes', () => {
    const [upper, lower] = parsePrograms(sample)[0]!.days
    expect(upper?.exercises[2]).toMatchObject({ name: 'Triceps Pushdown (Cable - Straight Bar)', targetWeight: 32.5, targetReps: '8-10' })
    expect(lower?.exercises[0]).toMatchObject({ targetWeight: 61.25, targetReps: '15' })
  })

  it('ignores format-note bullets before the first program', () => {
    expect(parsePrograms(sample)[0]?.days.flatMap((d) => d.exercises)).toHaveLength(5)
  })

  it('reports the line number of a malformed exercise', () => {
    const bad = '## Program: X\n### Day\n- Squat: 4 x 5 at 95 kg, rest 180s\n'
    expect(() => parsePrograms(bad)).toThrow(ProgramsParseError)
    expect(() => parsePrograms(bad)).toThrow(/line 3/)
  })

  it('rejects a day outside a program and an empty day', () => {
    expect(() => parsePrograms('### Day\n- A: 1 x 1 @ BW, rest 60s')).toThrow(/not under/)
    expect(() => parsePrograms('## Program: X\n### Empty\n')).toThrow(/no exercises/)
  })

  it('dedupes exercise names across days', () => {
    expect(uniqueExerciseNames(parsePrograms(sample))).toEqual([
      'Bench Press (Barbell)',
      'Pull Up',
      'Triceps Pushdown (Cable - Straight Bar)',
      'Calf Press on Seated Leg Press',
    ])
  })
})

describe('the real programs.md', () => {
  const programs = parsePrograms(readFileSync(new URL('../../programs.md', import.meta.url), 'utf8'))

  it('parses with the expected shape', () => {
    expect(programs.map((p) => p.name)).toEqual(['Upper/Lower'])
    expect(programs[0]?.days.map((d) => [d.name, d.exercises.length])).toEqual([
      ['Upper A', 8],
      ['Lower A', 5],
      ['Upper B', 9],
      ['Lower B', 4],
    ])
  })

  it('matches the committed src/db/seed.ts (run a build to regenerate)', () => {
    const committed = readFileSync(new URL('../db/seed.ts', import.meta.url), 'utf8')
    expect(committed).toBe(renderSeedModule(programs))
  })
})
