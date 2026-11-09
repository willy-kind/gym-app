import { useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Page } from '../../components/Page'
import { ButtonRow, ListGroup } from '../../components/List'
import { BottomAction } from '../../components/Button'
import { attempt } from '../../components/attempt'
import { getProgramDetail, listPrograms, type ProgramDetail } from '../../db/programs'
import { getActiveSession, getLastTrainedByDay, startSession } from '../../db/sessions'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatDay } from '../../lib/date'
import { suggestNextDay } from '../../lib/session'
import { clearRest } from './restTimerStore'
import { useSettings } from '../settings/settingsStore'
import { useNow } from '../../components/useNow'
import { backupReminder } from '../../lib/settings'
import { db } from '../../db/db'

async function loadTrain() {
  const active = await getActiveSession()
  if (active) return { activeId: active.id }
  const programs = (await listPrograms()).filter((p) => !p.program.archived)
  const details = (await Promise.all(programs.map((p) => getProgramDetail(p.program.id)))).filter((d): d is ProgramDetail => d !== null)
  const lastTrained = await getLastTrainedByDay()
  const hasWorkouts = (await db.sessions.filter((s) => s.finishedAt !== undefined).count()) > 0
  return { activeId: undefined, details, lastTrained, hasWorkouts }
}

const settingsLink = (
  <Link to="/settings" aria-label="Settings" className="flex min-h-11 min-w-11 items-center justify-center text-accent">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  </Link>
)

/** Pick a day to train, or jump straight back into an unfinished session. */
export function TrainPage() {
  const data = useLiveQuery(loadTrain, [])
  const navigate = useNavigate()
  const { lastBackupAt } = useSettings()
  const now = useNow(60 * 60_000)

  // A rest timer can't outlive its workout (e.g. one deleted from History).
  const noSession = data !== undefined && data.activeId === undefined
  useEffect(() => {
    if (noSession) clearRest()
  }, [noSession])

  if (!data) return <Page title="Train" action={settingsLink} />
  if (data.activeId !== undefined) return <Navigate to={`/train/session/${data.activeId}`} replace />

  const { details, lastTrained, hasWorkouts } = data
  const reminder = backupReminder(lastBackupAt, hasWorkouts, now)
  const start = (programDayId?: number) =>
    attempt(async () => {
      const id = await startSession(programDayId)
      void navigate(`/train/session/${id}`)
    })

  // Suggest the next day of the program trained most recently.
  const withLast = details.map((d) => {
    const last = d.days.reduce<{ dayId?: number; at: number }>((best, { day }) => {
      const at = lastTrained.get(day.id) ?? -Infinity
      return at > best.at ? { dayId: day.id, at } : best
    }, { at: -Infinity })
    return { detail: d, last, next: suggestNextDay(d.days.map((x) => x.day), last.dayId) }
  })
  const primary = [...withLast].sort((a, b) => b.last.at - a.last.at)[0]

  return (
    <Page title="Train" action={settingsLink}>
      {reminder && (
        <Link to="/settings" className="card-edge mb-4 flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Time for a backup</span>
            <span className="block text-[15px] text-label-2">
              {reminder.days === null ? 'You haven’t backed up yet. Your workouts only live on this phone.' : `Last backup was ${reminder.days} days ago.`}
            </span>
          </span>
          <span className="shrink-0 font-semibold text-accent">Back up</span>
        </Link>
      )}
      {withLast.map(({ detail, next }) => (
        <ListGroup key={detail.program.id} header={detail.program.name}>
          {detail.days.map(({ day, exerciseCount }) => {
            const last = lastTrained.get(day.id)
            return (
              <ButtonRow
                key={day.id}
                title={day.name}
                subtitle={`${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}${last ? ` · Last: ${formatDay(last)}` : ''}`}
                detail={next?.id === day.id ? <span className="rounded-full bg-accent px-2.5 py-1 text-[13px] font-semibold text-on-accent">Next</span> : undefined}
                onClick={() => void start(day.id)}
              />
            )
          })}
        </ListGroup>
      ))}
      {details.length === 0 && <p className="mb-6 px-1 text-label-2">No active programs. Create one in the Programs tab, or start an empty workout.</p>}
      <ListGroup>
        <ButtonRow title="Empty workout" subtitle="Add exercises as you go" onClick={() => void start()} />
      </ListGroup>
      {primary?.next && <BottomAction onClick={() => void start(primary.next!.id)}>Start {primary.next.name}</BottomAction>}
    </Page>
  )
}
