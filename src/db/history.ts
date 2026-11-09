import { db } from './db'
import { logSet } from './sessions'
import type { Session } from './types'
import { sessionStats, type SessionStats } from '../lib/history'
import { findPRs } from '../lib/progression'

type WithId<T> = T & { id: number }

export interface SessionSummary {
  session: WithId<Session>
  /** Day name, or "Workout" for an empty workout or a deleted day. */
  title: string
  programName?: string
  stats: SessionStats
  /** Sets in this workout that were personal records when logged. */
  prCount: number
}

export interface HistoryList {
  active?: WithId<Session>
  /** Day name of the session in progress, or "Workout". */
  activeTitle?: string
  items: SessionSummary[]
  /** Finished sessions in total, to know if there are more to show. */
  total: number
}

/** The `limit` most recent finished sessions with their stats, plus any session in progress. */
export async function listHistory(limit: number): Promise<HistoryList> {
  const [finished, total, active, days, programs] = await Promise.all([
    db.sessions.orderBy('startedAt').reverse().filter((s) => s.finishedAt !== undefined).limit(limit).toArray(),
    db.sessions.filter((s) => s.finishedAt !== undefined).count(),
    db.sessions.filter((s) => s.finishedAt === undefined).first(),
    db.programDays.toArray(),
    db.programs.toArray(),
  ])
  // Every set, because a PR is judged against all earlier sets of the exercise.
  const allSets = await db.sets.toArray()
  const listed = new Set(finished.map((s) => s.id!))
  const sets = allSets.filter((s) => listed.has(s.sessionId))
  const dayById = new Map(days.map((d) => [d.id!, d]))
  const programById = new Map(programs.map((p) => [p.id!, p]))
  const titleOf = (session: Session) => (session.programDayId === undefined ? undefined : dayById.get(session.programDayId)?.name) ?? 'Workout'

  const prsBySession = new Map<number, number>()
  const byExercise = new Map<number, typeof allSets>()
  for (const s of allSets) {
    const group = byExercise.get(s.exerciseId)
    if (group) group.push(s)
    else byExercise.set(s.exerciseId, [s])
  }
  const sessionOfSet = new Map(allSets.map((s) => [s.id!, s.sessionId]))
  for (const group of byExercise.values()) {
    for (const id of findPRs(group.map((s) => ({ ...s, id: s.id! })))) {
      const sessionId = sessionOfSet.get(id)!
      prsBySession.set(sessionId, (prsBySession.get(sessionId) ?? 0) + 1)
    }
  }

  return {
    active: active as WithId<Session> | undefined,
    activeTitle: active ? titleOf(active) : undefined,
    total,
    items: finished.map((session) => {
      const day = session.programDayId === undefined ? undefined : dayById.get(session.programDayId)
      return {
        session: session as WithId<Session>,
        title: titleOf(session),
        programName: day ? programById.get(day.programId)?.name : undefined,
        stats: sessionStats(sets.filter((s) => s.sessionId === session.id)),
        prCount: prsBySession.get(session.id!) ?? 0,
      }
    }),
  }
}

/**
 * Changes a session's start and finish. Moving the start shifts every set's
 * timestamp by the same amount, so "Last time" and charts keep the right order.
 */
export async function updateSessionTimes(id: number, startedAt: number, finishedAt: number): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    const session = await db.sessions.get(id)
    if (!session) throw new Error('Workout not found')
    const shift = startedAt - session.startedAt
    if (shift !== 0) {
      await db.sets
        .where('sessionId')
        .equals(id)
        .modify((s) => {
          s.completedAt += shift
        })
    }
    await db.sessions.update(id, { startedAt, finishedAt })
  })
}

export async function updateSessionNotes(id: number, notes: string): Promise<void> {
  const trimmed = notes.trim()
  await db.sessions.update(id, { notes: trimmed === '' ? undefined : trimmed })
}

/**
 * Adds a set to a past session. It's timestamped just after the session's
 * last set (or at its start) so it sorts inside that workout, not today.
 */
export async function addSetToSession(
  sessionId: number,
  values: { exerciseId: number; weight: number; reps: number; isWarmup: boolean },
): Promise<number> {
  return db.transaction('rw', db.sessions, db.sets, async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) throw new Error('Workout not found')
    const sets = await db.sets.where('sessionId').equals(sessionId).toArray()
    const at = sets.reduce((max, s) => Math.max(max, s.completedAt + 1000), session.startedAt)
    return logSet({ sessionId, ...values }, at)
  })
}
