import Dexie from 'dexie'
import { db } from './db'
import type { Exercise, Program, ProgramDay, Session, WorkoutSet } from './types'
import type { LoggedSet, PlanEntry, SetValues } from '../lib/session'
import { findPRs } from '../lib/progression'

type WithId<T> = T & { id: number }

const toLogged = (s: WorkoutSet): LoggedSet => ({
  id: s.id!,
  exerciseId: s.exerciseId,
  order: s.order,
  weight: s.weight,
  reps: s.reps,
  isWarmup: s.isWarmup,
  completedAt: s.completedAt,
})

// ---------- starting / ending ----------

/** The unfinished session, if any. There is at most one. */
export async function getActiveSession(): Promise<WithId<Session> | undefined> {
  return (await db.sessions.filter((s) => s.finishedAt === undefined).first()) as WithId<Session> | undefined
}

/** Starts a session for a program day (or an empty one). If one is already running, returns that instead. */
export async function startSession(programDayId?: number, now = Date.now()): Promise<number> {
  return db.transaction('rw', db.sessions, async () => {
    const active = await getActiveSession()
    if (active) return active.id
    return db.sessions.add(programDayId === undefined ? { startedAt: now } : { programDayId, startedAt: now }) as Promise<number>
  })
}

export async function finishSession(id: number, now = Date.now()): Promise<void> {
  await db.sessions.update(id, { finishedAt: now })
}

/** Deletes a session and all its sets. */
export async function discardSession(id: number): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(id).delete()
    await db.sessions.delete(id)
  })
}

// ---------- sets ----------

/** Saves a set immediately. Its order is the next set number for that exercise in the session. */
export async function logSet(
  input: { sessionId: number; exerciseId: number; weight: number; reps: number; isWarmup: boolean },
  now = Date.now(),
): Promise<number> {
  return db.transaction('rw', db.sets, async () => {
    const existing = await db.sets.where('sessionId').equals(input.sessionId).filter((s) => s.exerciseId === input.exerciseId).toArray()
    const order = existing.reduce((max, s) => Math.max(max, s.order + 1), 0)
    return db.sets.add({ ...input, order, completedAt: now }) as Promise<number>
  })
}

export async function updateSet(id: number, changes: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'isWarmup'>>): Promise<void> {
  await db.sets.update(id, changes)
}

/** Deletes a set and renumbers the remaining sets of that exercise in the session. */
export async function deleteSet(id: number): Promise<void> {
  await db.transaction('rw', db.sets, async () => {
    const set = await db.sets.get(id)
    if (!set) return
    await db.sets.delete(id)
    const rest = await db.sets.where('sessionId').equals(set.sessionId).filter((s) => s.exerciseId === set.exerciseId).sortBy('order')
    for (const [i, s] of rest.entries()) if (s.order !== i) await db.sets.update(s.id!, { order: i })
  })
}

// ---------- history lookups ----------

export interface PreviousPerformance {
  sessionId: number
  startedAt: number
  /** Working sets only, in order. */
  sets: SetValues[]
}

/** The most recent other session with working sets for this exercise. */
export async function getPreviousPerformance(exerciseId: number, excludeSessionId: number): Promise<PreviousPerformance | null> {
  const latest = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .filter((s) => s.sessionId !== excludeSessionId && !s.isWarmup)
    .first()
  if (!latest) return null
  const [session, sets] = await Promise.all([
    db.sessions.get(latest.sessionId),
    db.sets.where('sessionId').equals(latest.sessionId).filter((s) => s.exerciseId === exerciseId && !s.isWarmup).sortBy('order'),
  ])
  return { sessionId: latest.sessionId, startedAt: session?.startedAt ?? latest.completedAt, sets: sets.map((s) => ({ weight: s.weight, reps: s.reps })) }
}

/** When each program day was last trained (most recent session start). */
export async function getLastTrainedByDay(): Promise<Map<number, number>> {
  const last = new Map<number, number>()
  await db.sessions.each((s) => {
    if (s.programDayId === undefined) return
    if ((last.get(s.programDayId) ?? -Infinity) < s.startedAt) last.set(s.programDayId, s.startedAt)
  })
  return last
}

// ---------- screen queries ----------

export interface SessionView {
  session: WithId<Session>
  day?: WithId<ProgramDay>
  program?: WithId<Program>
  plan: PlanEntry[]
  sets: LoggedSet[]
  exercises: Map<number, WithId<Exercise>>
  previous: Map<number, PreviousPerformance>
  /** Ids of this session's sets that were personal records when logged. */
  prSetIds: Set<number>
}

/**
 * Everything the session screen needs. `extraExerciseIds` are ad-hoc exercises
 * added but not logged yet, so their names and history load too.
 */
export async function getSessionView(sessionId: number, extraExerciseIds: readonly number[] = []): Promise<SessionView | null> {
  const session = await db.sessions.get(sessionId)
  if (!session) return null
  const day = session.programDayId === undefined ? undefined : await db.programDays.get(session.programDayId)
  const program = day ? await db.programs.get(day.programId) : undefined
  const items = day ? await db.programDayExercises.where('programDayId').equals(day.id!).sortBy('order') : []
  const sets = (await db.sets.where('sessionId').equals(sessionId).toArray()).map(toLogged)

  const ids = [...new Set([...items.map((i) => i.exerciseId), ...sets.map((s) => s.exerciseId), ...extraExerciseIds])]
  const exerciseRows = await db.exercises.bulkGet(ids)
  const exercises = new Map<number, WithId<Exercise>>()
  for (const e of exerciseRows) if (e) exercises.set(e.id!, e as WithId<Exercise>)

  const previous = new Map<number, PreviousPerformance>()
  await Promise.all(
    ids.map(async (id) => {
      const p = await getPreviousPerformance(id, sessionId)
      if (p) previous.set(id, p)
    }),
  )

  // PRs are judged against every set of the exercise ever logged, in time order.
  const prSetIds = new Set<number>()
  const loggedHere = new Set(sets.map((s) => s.id))
  await Promise.all(
    [...new Set(sets.map((s) => s.exerciseId))].map(async (exerciseId) => {
      const all = await db.sets.where('[exerciseId+completedAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).toArray()
      for (const id of findPRs(all.map(toLogged))) if (loggedHere.has(id)) prSetIds.add(id)
    }),
  )

  const plan: PlanEntry[] = items.map((i) => ({
    exerciseId: i.exerciseId,
    name: exercises.get(i.exerciseId)?.name ?? 'Unknown exercise',
    targetSets: i.targetSets,
    targetReps: i.targetReps,
    targetWeight: i.targetWeight,
    restSeconds: i.restSeconds,
  }))

  return {
    session: session as WithId<Session>,
    day: day as WithId<ProgramDay> | undefined,
    program: program as WithId<Program> | undefined,
    plan,
    sets,
    exercises,
    previous,
    prSetIds,
  }
}
