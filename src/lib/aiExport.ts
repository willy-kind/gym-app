/**
 * Plain-text summaries of workouts to paste into a chat with an AI assistant for feedback.
 * Pure: the caller gathers the data (db/share.ts) and shares the text.
 */
import { formatClock, formatDuration } from './date'
import { formatVolume, formatWeight } from './format'
import { epley } from './progress'
import { formatSetWeight, formatSetsSummary, type SetValues } from './session'
import { formatRest } from './targets'
import type { WeightUnit } from './units'

export interface ShareSet extends SetValues {
  isWarmup: boolean
  completedAt: number
  /** A personal record when it was logged. */
  pr: boolean
}

export interface ShareTarget {
  targetSets: number
  targetReps: string
  targetWeight?: number
  restSeconds: number
}

export interface ShareExercise {
  name: string
  bodyweight: boolean
  /** The program day's current target; absent for exercises added during the workout. */
  target?: ShareTarget
  sets: ShareSet[]
  /** The most recent earlier workout's working sets, for comparison. */
  lastTime?: { date: number; sets: SetValues[] }
}

export interface ShareWorkout {
  /** Day name, or "Workout". */
  title: string
  programName?: string
  startedAt: number
  finishedAt: number
  notes?: string
  exercises: ShareExercise[]
}

/** Rests shorter than this are timestamps of sets added afterwards, not real rests. */
const MIN_REST_S = 10
/** Longer gaps are breaks (or a set logged late), not rest between sets. */
const MAX_REST_S = 30 * 60

export function aiPrompt(unit: WeightUnit): string {
  return [
    'I track my strength training in my gym app. Below is my log.',
    `Weights are in ${unit}. "W" = warm-up set, "PR" = personal record when logged, "rest" = time since the previous set of that exercise, "BW" = bodyweight. Targets are what my program prescribes.`,
    'Please give me feedback on my progression, training volume and rest times, point out anything that looks off (stalls, fatigue, imbalances, sets far from target), and suggest concrete changes for my next sessions.',
  ].join('\n')
}

/** "Fri 6 Nov 2026" */
export function formatShareDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '')
}

/** Seconds between two sets, or null when the gap isn't a real rest (see MIN_REST_S / MAX_REST_S). */
export function restBetween(previousAt: number, at: number): number | null {
  const s = Math.round((at - previousAt) / 1000)
  return s >= MIN_REST_S && s <= MAX_REST_S ? s : null
}

function targetText(t: ShareTarget, unit: WeightUnit): string {
  return `${t.targetSets} × ${t.targetReps} @ ${formatWeight(t.targetWeight ?? 0, unit)}, rest ${formatRest(t.restSeconds)}`
}

function exerciseLines(e: ShareExercise, unit: WeightUnit, opts: { targets: boolean }): string[] {
  const header = opts.targets ? (e.target ? `${e.name} — target ${targetText(e.target, unit)}` : `${e.name} — not in the plan`) : e.name
  const lines = [header]
  const sets = [...e.sets].sort((a, b) => a.completedAt - b.completedAt)
  let n = 0
  sets.forEach((s, i) => {
    const label = s.isWarmup ? 'W ' : `${++n}.`
    const rest = i > 0 ? restBetween(sets[i - 1]!.completedAt, s.completedAt) : null
    const parts = [`${formatSetWeight(s.weight, e.bodyweight, unit)} × ${s.reps}`]
    if (rest !== null) parts.push(`rest ${formatRest(rest)}`)
    lines.push(`  ${label} ${parts.join(' · ')}${s.pr ? ' (PR)' : ''}`)
  })
  const working = sets.filter((s) => !s.isWarmup && s.weight > 0)
  if (working.length > 0) lines.push(`  Best e1RM: ${formatWeight(Math.max(...working.map((s) => epley(s.weight, s.reps))), unit)}`)
  if (e.lastTime) {
    const summary = formatSetsSummary(e.lastTime.sets, e.bodyweight, unit)
    if (summary) lines.push(`  Last time (${formatShareDate(e.lastTime.date)}): ${summary}`)
  }
  return lines
}

function workoutLines(w: ShareWorkout, unit: WeightUnit, opts: { targets: boolean }): string[] {
  const name = w.programName ? `${w.title} (${w.programName})` : w.title
  const lines = [
    `Workout: ${name} — ${formatShareDate(w.startedAt)}, ${formatClock(w.startedAt)}–${formatClock(w.finishedAt)} (${formatDuration(w.finishedAt - w.startedAt)})`,
  ]
  if (w.notes) lines.push(`Notes: ${w.notes}`)
  for (const e of w.exercises) {
    lines.push('')
    lines.push(...exerciseLines(e, unit, opts))
  }
  const working = w.exercises.flatMap((e) => e.sets.filter((s) => !s.isWarmup))
  const volume = working.reduce((sum, s) => sum + s.weight * s.reps, 0)
  lines.push('')
  lines.push(`Totals: ${working.length} working ${working.length === 1 ? 'set' : 'sets'} · ${formatVolume(volume, unit)} volume`)
  return lines
}

/** One workout, with targets and last time per exercise. */
export function shareTextForWorkout(w: ShareWorkout, unit: WeightUnit): string {
  return [aiPrompt(unit), '', ...workoutLines(w, unit, { targets: true })].join('\n')
}

/**
 * Several workouts, oldest first. The program targets are listed once at the top
 * (per day, as they are now) instead of under every workout.
 */
export function shareTextForWorkouts(workouts: readonly ShareWorkout[], unit: WeightUnit): string {
  const ordered = [...workouts].sort((a, b) => a.startedAt - b.startedAt)
  const lines = [aiPrompt(unit), '']
  const seenDays = new Set<string>()
  const targetLines: string[] = []
  for (const w of ordered) {
    const key = `${w.programName ?? ''}/${w.title}`
    const planned = w.exercises.filter((e) => e.target)
    if (seenDays.has(key) || planned.length === 0) continue
    seenDays.add(key)
    targetLines.push(`${w.programName ? `${w.title} (${w.programName})` : w.title}:`)
    for (const e of planned) targetLines.push(`  ${e.name}: ${targetText(e.target!, unit)}`)
  }
  if (targetLines.length > 0) lines.push('Program targets (current):', ...targetLines, '')
  const from = ordered[0]
  const to = ordered.at(-1)
  if (from && to) lines.push(`${ordered.length} ${ordered.length === 1 ? 'workout' : 'workouts'}, ${formatShareDate(from.startedAt)} to ${formatShareDate(to.startedAt)}, oldest first.`)
  for (const w of ordered) {
    lines.push('', '---', '')
    lines.push(...workoutLines(w, unit, { targets: false }))
  }
  return lines.join('\n')
}
