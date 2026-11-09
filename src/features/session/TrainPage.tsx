import { Navigate, useNavigate } from 'react-router'
import { Page } from '../../components/Page'
import { ButtonRow, ListGroup } from '../../components/List'
import { BottomAction } from '../../components/Button'
import { attempt } from '../../components/attempt'
import { getProgramDetail, listPrograms, type ProgramDetail } from '../../db/programs'
import { getActiveSession, getLastTrainedByDay, startSession } from '../../db/sessions'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatDay } from '../../lib/date'
import { suggestNextDay } from '../../lib/session'

async function loadTrain() {
  const active = await getActiveSession()
  if (active) return { activeId: active.id }
  const programs = (await listPrograms()).filter((p) => !p.program.archived)
  const details = (await Promise.all(programs.map((p) => getProgramDetail(p.program.id)))).filter((d): d is ProgramDetail => d !== null)
  const lastTrained = await getLastTrainedByDay()
  return { activeId: undefined, details, lastTrained }
}

/** Pick a day to train, or jump straight back into an unfinished session. */
export function TrainPage() {
  const data = useLiveQuery(loadTrain, [])
  const navigate = useNavigate()

  if (!data) return <Page title="Train" />
  if (data.activeId !== undefined) return <Navigate to={`/train/session/${data.activeId}`} replace />

  const { details, lastTrained } = data
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
    <Page title="Train">
      {withLast.map(({ detail, next }) => (
        <ListGroup key={detail.program.id} header={detail.program.name}>
          {detail.days.map(({ day, exerciseCount }) => {
            const last = lastTrained.get(day.id)
            return (
              <ButtonRow
                key={day.id}
                title={day.name}
                subtitle={`${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}${last ? ` · Last: ${formatDay(last)}` : ''}`}
                detail={next?.id === day.id ? <span className="rounded-full bg-accent px-2.5 py-1 text-[13px] font-semibold text-white">Next</span> : undefined}
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
