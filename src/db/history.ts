import { db } from './db'
import { logSet } from './sessions'
import type { Session } from './types'
import { sessionStats, type SessionStats } from '../lib/history'

type WithId<T> = T & { id: number }

export interface SessionSummary {
  session: WithId<Session>
  /** Day name, or "Workout" for an empty workout or a deleted day. */
  title: string
  programName?: string
  stats: SessionStats
}

export interface HistoryList {
  active?: WithId<Session>
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
  const sets = await db.sets.where('sessionId').anyOf(finished.map((s) => s.id!)).toArray()
  const dayById = new Map(days.map((d) => [d.id!, d]))
  const programById = new Map(programs.map((p) => [p.id!, p]))

  return {
    active: active as WithId<Session> | undefined,
    total,
    items: finished.map((session) => {
      const day = session.programDayId === undefined ? undefined : dayById.get(session.programDayId)
      return {
        session: session as WithId<Session>,
        title: day?.name ?? 'Workout',
        programName: day ? programById.get(day.programId)?.name : undefined,
        stats: sessionStats(sets.filter((s) => s.sessionId === session.id)),
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
