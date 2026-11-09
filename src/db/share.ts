import { db } from './db'
import type { Session, WorkoutSet } from './types'
import { findPRs } from '../lib/progression'
import { isBodyweightExercise, type SetValues } from '../lib/session'
import type { ShareExercise, ShareTarget, ShareWorkout } from '../lib/aiExport'

export type ShareRange = 'last4' | 'last8' | '4weeks'

export const SHARE_RANGES: readonly { value: ShareRange; label: string }[] = [
  { value: 'last4', label: 'Last 4' },
  { value: 'last8', label: 'Last 8' },
  { value: '4weeks', label: '4 weeks' },
]

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000

type WithId<T> = T & { id: number }

async function loadAll() {
  const [sessions, sets, exercises, days, programs, items] = await Promise.all([
    db.sessions.toArray(),
    db.sets.toArray(),
    db.exercises.toArray(),
    db.programDays.toArray(),
    db.programs.toArray(),
    db.programDayExercises.toArray(),
  ])
  const prIds = new Set<number>()
  const setsByExercise = new Map<number, WithId<WorkoutSet>[]>()
  for (const s of sets as WithId<WorkoutSet>[]) {
    const group = setsByExercise.get(s.exerciseId)
    if (group) group.push(s)
    else setsByExercise.set(s.exerciseId, [s])
  }
  for (const group of setsByExercise.values()) for (const id of findPRs(group)) prIds.add(id)
  return {
    sessions: sessions as WithId<Session>[],
    startedAt: new Map(sessions.map((s) => [s.id!, s.startedAt])),
    sets: sets as WithId<WorkoutSet>[],
    setsByExercise,
    exerciseName: new Map(exercises.map((e) => [e.id!, e.name])),
    dayById: new Map(days.map((d) => [d.id!, d])),
    programName: new Map(programs.map((p) => [p.id!, p.name])),
    items,
    prIds,
  }
}

type All = Awaited<ReturnType<typeof loadAll>>

/** Working sets of the latest earlier workout that did this exercise. */
function lastTimeBefore(all: All, exerciseId: number, before: number): { date: number; sets: SetValues[] } | undefined {
  let bestSession: number | undefined
  let bestStart = -Infinity
  for (const s of all.setsByExercise.get(exerciseId) ?? []) {
    if (s.isWarmup) continue
    const start = all.startedAt.get(s.sessionId) ?? s.completedAt
    if (start < before && start > bestStart) {
      bestStart = start
      bestSession = s.sessionId
    }
  }
  if (bestSession === undefined) return undefined
  const sets = (all.setsByExercise.get(exerciseId) ?? [])
    .filter((s) => s.sessionId === bestSession && !s.isWarmup)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ weight: s.weight, reps: s.reps }))
  return { date: bestStart, sets }
}

function buildWorkout(all: All, session: WithId<Session>): ShareWorkout {
  const day = session.programDayId === undefined ? undefined : all.dayById.get(session.programDayId)
  const targets = new Map<number, ShareTarget>()
  if (day) {
    for (const i of all.items.filter((i) => i.programDayId === day.id).sort((a, b) => a.order - b.order)) {
      if (!targets.has(i.exerciseId)) {
        targets.set(i.exerciseId, { targetSets: i.targetSets, targetReps: i.targetReps, targetWeight: i.targetWeight, restSeconds: i.restSeconds })
      }
    }
  }

  const own = all.sets.filter((s) => s.sessionId === session.id).sort((a, b) => a.completedAt - b.completedAt)
  const byExercise = new Map<number, WithId<WorkoutSet>[]>()
  for (const s of own) {
    const group = byExercise.get(s.exerciseId)
    if (group) group.push(s)
    else byExercise.set(s.exerciseId, [s])
  }

  // In the order they were done (first set first).
  const exercises: ShareExercise[] = [...byExercise.entries()].map(([exerciseId, sets]) => {
    const target = targets.get(exerciseId)
    return {
      name: all.exerciseName.get(exerciseId) ?? 'Unknown exercise',
      bodyweight: isBodyweightExercise(target?.targetWeight, target !== undefined, sets),
      target,
      sets: sets.map((s) => ({ weight: s.weight, reps: s.reps, isWarmup: s.isWarmup, completedAt: s.completedAt, pr: all.prIds.has(s.id) })),
      lastTime: lastTimeBefore(all, exerciseId, session.startedAt),
    }
  })

  return {
    title: day?.name ?? 'Workout',
    programName: day ? all.programName.get(day.programId) : undefined,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt ?? own.at(-1)?.completedAt ?? session.startedAt,
    notes: session.notes,
    exercises,
  }
}

/** One finished workout, ready to format for sharing. Null if it doesn't exist. */
export async function getShareWorkout(sessionId: number): Promise<ShareWorkout | null> {
  const all = await loadAll()
  const session = all.sessions.find((s) => s.id === sessionId)
  return session ? buildWorkout(all, session) : null
}

/** Finished workouts in a range, oldest first: the last 4 or 8, or those of the last 4 weeks. */
export async function getShareWorkouts(range: ShareRange, now = Date.now()): Promise<ShareWorkout[]> {
  const all = await loadAll()
  const finished = all.sessions.filter((s) => s.finishedAt !== undefined).sort((a, b) => b.startedAt - a.startedAt)
  const picked =
    range === 'last4' ? finished.slice(0, 4) : range === 'last8' ? finished.slice(0, 8) : finished.filter((s) => s.startedAt >= now - FOUR_WEEKS_MS)
  return picked.reverse().map((s) => buildWorkout(all, s))
}
