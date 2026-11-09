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
import { buildSessionExercises, isBodyweightExercise, type LoggedSet, type SessionExercise } from '../../lib/session'
import { ExercisePickerSheet } from '../programs/ExercisePickerSheet'
import { SetSheet, type SetValuesInput } from '../session/SetSheet'
import { NotesSheet, TimesSheet } from './EditSheets'
import { useUnit } from '../settings/settingsStore'
import { SetPill } from '../session/SetPill'
import { ShareWorkoutButton } from '../import-export/ShareWithAI'

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
          subtitle={[view.program?.name, `${formatClock(session.startedAt)}–${formatClock(session.finishedAt)}`, formatDuration(session.finishedAt - session.startedAt)]
            .filter(Boolean)
            .join(' · ')}
          detail={<span className="text-accent">Edit</span>}
          onClick={() => setDialog({ kind: 'times' })}
        />
        <ButtonRow
          title={session.notes ?? <span className="text-label-2">Add notes</span>}
          detail={session.notes ? <span className="text-accent">Edit</span> : undefined}
          onClick={() => setDialog({ kind: 'notes' })}
        />
      </ListGroup>
      <div className="-mt-3 mb-6 grid grid-cols-3 gap-2">
        <StatTile value={String(stats.workingSets)} label={stats.workingSets === 1 ? 'set' : 'sets'} />
        <StatTile value={String(stats.exercises)} label={stats.exercises === 1 ? 'exercise' : 'exercises'} />
        {/* "2,170 kg" → big "2,170", caption "kg volume", so long totals still fit the tile. */}
        <StatTile value={formatVolume(stats.volume, unit).replace(/ (kg|lb)$/, '')} label={`${unit} volume`} />
      </div>

      {exercises.length === 0 && <p className="mb-6 px-1 text-label-2">No sets in this workout.</p>}
      {exercises.map((e) => {
        const bw = bodyweightOf(e)
        const last = e.sets.at(-1)
        let working = 0
        return (
          <section key={e.exerciseId} className="card-edge mb-3 rounded-xl bg-surface p-4">
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-[17px] font-semibold break-words">{e.name}</h2>
              <span className="shrink-0 text-[15px] font-semibold text-label-2 tabular-nums">{countOf(e.workingSets, 'set')}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {e.sets.map((s) => {
                if (!s.isWarmup) working++
                return (
                  <li key={s.id}>
                    <SetPill
                      set={s}
                      label={s.isWarmup ? 'W' : String(working)}
                      bodyweight={bw}
                      unit={unit}
                      pr={view.prSetIds.has(s.id)}
                      onEdit={() => setDialog({ kind: 'edit', set: s, bodyweight: bw })}
                    />
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="mt-1.5 min-h-11 text-[15px] font-semibold text-accent active:opacity-60"
              onClick={() =>
                setDialog({
                  kind: 'add',
                  exerciseId: e.exerciseId,
                  name: e.name,
                  initial: { weight: last?.weight ?? 0, reps: last?.reps ?? 8, isWarmup: false },
                  bodyweight: bw,
                })
              }
            >
              + Add set
            </button>
          </section>
        )
      })}

      <div className="mb-4 flex flex-col gap-3">
        <ShareWorkoutButton sessionId={session.id} />
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

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card-edge min-w-0 rounded-xl bg-surface px-3 py-2.5">
      <div className="truncate text-[20px] font-bold tabular-nums">{value}</div>
      <div className="text-[13px] text-label-2">{label}</div>
    </div>
  )
}
