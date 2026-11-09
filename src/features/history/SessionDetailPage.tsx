import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Page, Placeholder } from '../../components/Page'
import { ButtonRow, ListGroup } from '../../components/List'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/Dialogs'
import { attempt } from '../../components/attempt'
import { addSetToSession } from '../../db/history'
import { deleteSet, discardSession, getSessionView, updateSet } from '../../db/sessions'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatClock, formatDay, formatDuration } from '../../lib/date'
import { countOf, formatVolume } from '../../lib/format'
import { sessionStats } from '../../lib/history'
import { buildSessionExercises, formatSetWeight, isBodyweightExercise, type LoggedSet, type SessionExercise } from '../../lib/session'
import { ExercisePickerSheet } from '../programs/ExercisePickerSheet'
import { SetSheet, type SetValuesInput } from '../session/SetSheet'
import { NotesSheet, TimesSheet } from './EditSheets'
import { useUnit } from '../settings/settingsStore'

type Dialog =
  | { kind: 'edit'; set: LoggedSet; bodyweight: boolean }
  | { kind: 'add'; exerciseId: number; name: string; initial: SetValuesInput; bodyweight: boolean }
  | { kind: 'pick' }
  | { kind: 'times' }
  | { kind: 'notes' }
  | { kind: 'delete' }

export function SessionDetailPage() {
  const sessionId = Number(useParams().sessionId)
  const view = useLiveQuery(() => getSessionView(sessionId), [sessionId])
  const navigate = useNavigate()
  const unit = useUnit()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const close = () => setDialog(null)
  const back = { to: '/history', label: 'History' }

  if (view === undefined) return <Page title="" back={back} />
  if (view === null) {
    return (
      <Page title="Not found" back={back}>
        <Placeholder>This workout no longer exists.</Placeholder>
      </Page>
    )
  }
  const { session } = view
  if (session.finishedAt === undefined) return <Navigate to={`/train/session/${session.id}`} replace />

  const nameOf = (id: number) => view.exercises.get(id)?.name ?? 'Unknown exercise'
  // In the order they were done.
  const exercises = buildSessionExercises([], view.sets, [], nameOf)
  const planFor = (id: number) => view.plan.find((p) => p.exerciseId === id)
  const bodyweightOf = (e: SessionExercise) => {
    const p = planFor(e.exerciseId)
    return p ? isBodyweightExercise(p.targetWeight, true, []) : isBodyweightExercise(undefined, false, e.sets)
  }
  const stats = sessionStats(view.sets)

  return (
    <Page title={view.day?.name ?? 'Workout'} back={back}>
      <ListGroup>
        <ButtonRow
          title={formatDay(session.startedAt)}
          subtitle={`${formatClock(session.startedAt)}–${formatClock(session.finishedAt)} · ${formatDuration(session.finishedAt - session.startedAt)}`}
          detail={<span className="text-accent">Edit</span>}
          onClick={() => setDialog({ kind: 'times' })}
        />
        <ButtonRow
          title={session.notes ?? <span className="text-label-2">Add notes</span>}
          detail={session.notes ? <span className="text-accent">Edit</span> : undefined}
          onClick={() => setDialog({ kind: 'notes' })}
        />
      </ListGroup>
      <p className="-mt-4 mb-6 px-4 text-[13px] text-label-2 tabular-nums">
        {[view.program?.name, countOf(stats.workingSets, 'set'), countOf(stats.exercises, 'exercise'), `${formatVolume(stats.volume, unit)} volume`].filter(Boolean).join(' · ')}
      </p>

      {exercises.length === 0 && <p className="mb-6 px-1 text-label-2">No sets in this workout.</p>}
      {exercises.map((e) => {
        const bw = bodyweightOf(e)
        const last = e.sets.at(-1)
        let working = 0
        return (
          <ListGroup key={e.exerciseId} header={e.name}>
            {e.sets.map((s) => {
              if (!s.isWarmup) working++
              return (
                <ButtonRow
                  key={s.id}
                  title={
                    <span className="flex gap-3 tabular-nums">
                      <span className={`w-7 font-semibold ${s.isWarmup ? 'text-label-2' : 'text-accent'}`}>{s.isWarmup ? 'W' : working}</span>
                      <span>
                        {formatSetWeight(s.weight, bw, unit)} × {s.reps}
                      </span>
                    </span>
                  }
                  onClick={() => setDialog({ kind: 'edit', set: s, bodyweight: bw })}
                />
              )
            })}
            <ButtonRow
              title={<span className="text-accent">Add set</span>}
              onClick={() =>
                setDialog({
                  kind: 'add',
                  exerciseId: e.exerciseId,
                  name: e.name,
                  initial: { weight: last?.weight ?? 0, reps: last?.reps ?? 8, isWarmup: false },
                  bodyweight: bw,
                })
              }
            />
          </ListGroup>
        )
      })}

      <div className="mb-4 flex flex-col gap-3">
        <Button variant="secondary" onClick={() => setDialog({ kind: 'pick' })}>
          Add exercise
        </Button>
        <Button variant="danger" onClick={() => setDialog({ kind: 'delete' })}>
          Delete workout
        </Button>
      </div>

      {dialog?.kind === 'edit' && (
        <SetSheet
          title="Edit set"
          initial={dialog.set}
          bodyweight={dialog.bodyweight}
          onSave={(values) => updateSet(dialog.set.id, values)}
          onDelete={() => deleteSet(dialog.set.id)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'add' && (
        <SetSheet
          title={dialog.name}
          initial={dialog.initial}
          bodyweight={dialog.bodyweight}
          onSave={(values) => addSetToSession(sessionId, { exerciseId: dialog.exerciseId, ...values })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'pick' && (
        <ExercisePickerSheet
          excludeIds={exercises.map((e) => e.exerciseId)}
          onClose={close}
          onPick={(exerciseId) => {
            const p = planFor(exerciseId)
            setDialog({
              kind: 'add',
              exerciseId,
              name: nameOf(exerciseId),
              initial: { weight: p?.targetWeight ?? 0, reps: 8, isWarmup: false },
              bodyweight: p ? !p.targetWeight : false,
            })
          }}
        />
      )}
      {dialog?.kind === 'times' && <TimesSheet session={{ ...session, finishedAt: session.finishedAt }} onClose={close} />}
      {dialog?.kind === 'notes' && <NotesSheet sessionId={session.id} initial={session.notes ?? ''} onClose={close} />}
      {dialog?.kind === 'delete' && (
        <ConfirmSheet
          title="Delete workout?"
          message={`This deletes the workout on ${formatDay(session.startedAt)} and its ${view.sets.length} ${view.sets.length === 1 ? 'set' : 'sets'}. This can’t be undone.`}
          confirmLabel="Delete workout"
          onClose={close}
          onConfirm={async () => {
            if (await attempt(() => discardSession(sessionId))) void navigate('/history', { replace: true })
          }}
        />
      )}
    </Page>
  )
}
