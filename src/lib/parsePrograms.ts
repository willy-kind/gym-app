/**
 * Parser for programs.md (the starter-program seed source).
 * Runs at build time only (from vite.config.ts) — never at runtime.
 *
 * Format:
 *   ## Program: <name>
 *   ### <day name>
 *   - <exercise>: <sets> x <reps or range> @ <weight kg | BW>, rest <seconds>s
 */

export interface SeedDayExercise {
  name: string
  targetSets: number
  /** e.g. "8" or "6-7" */
  targetReps: string
  /** kg; 0 = bodyweight */
  targetWeight: number
  restSeconds: number
}

export interface SeedDay {
  name: string
  exercises: SeedDayExercise[]
}

export interface SeedProgram {
  name: string
  days: SeedDay[]
}

const PROGRAM_RE = /^##\s+Program:\s*(.+?)\s*$/
const DAY_RE = /^###\s+(.+?)\s*$/
const EXERCISE_RE =
  /^-\s+(.+?)\s*:\s*(\d+)\s*x\s*(\d+(?:\s*-\s*\d+)?)\s*@\s*(BW|\d+(?:\.\d+)?\s*kg)\s*,\s*rest\s+(\d+)\s*s\s*$/i

export class ProgramsParseError extends Error {
  readonly line: number

  constructor(message: string, line: number) {
    super(`programs.md line ${line}: ${message}`)
    this.name = 'ProgramsParseError'
    this.line = line
  }
}

export function parsePrograms(markdown: string): SeedProgram[] {
  const programs: SeedProgram[] = []
  let program: SeedProgram | undefined
  let day: SeedDay | undefined

  markdown.split(/\r?\n/).forEach((raw, i) => {
    const lineNo = i + 1
    const line = raw.trim()

    const programMatch = PROGRAM_RE.exec(line)
    if (programMatch) {
      program = { name: programMatch[1]!, days: [] }
      programs.push(program)
      day = undefined
      return
    }

    const dayMatch = DAY_RE.exec(line)
    if (dayMatch) {
      if (!program) throw new ProgramsParseError(`day "${dayMatch[1]}" is not under a "## Program:" heading`, lineNo)
      day = { name: dayMatch[1]!, exercises: [] }
      program.days.push(day)
      return
    }

    // Bullets before the first program (format notes) are documentation; skip them.
    if (!line.startsWith('- ') || !day) return

    const m = EXERCISE_RE.exec(line)
    if (!m) {
      throw new ProgramsParseError(
        `cannot parse exercise "${line}". Expected "- Name: 3 x 8-10 @ 60 kg, rest 120s"`,
        lineNo,
      )
    }
    const [, name, sets, reps, weight, rest] = m as unknown as [string, string, string, string, string, string]
    day.exercises.push({
      name,
      targetSets: Number(sets),
      targetReps: reps.replace(/\s+/g, ''),
      targetWeight: weight.toUpperCase() === 'BW' ? 0 : Number.parseFloat(weight),
      restSeconds: Number(rest),
    })
  })

  for (const p of programs) {
    if (p.days.length === 0) throw new ProgramsParseError(`program "${p.name}" has no days`, 0)
    for (const d of p.days) {
      if (d.exercises.length === 0) throw new ProgramsParseError(`day "${d.name}" has no exercises`, 0)
    }
  }
  return programs
}

/** Unique exercise names across all programs, in first-seen order. */
export function uniqueExerciseNames(programs: SeedProgram[]): string[] {
  const names = new Set<string>()
  for (const p of programs) for (const d of p.days) for (const e of d.exercises) names.add(e.name)
  return [...names]
}
