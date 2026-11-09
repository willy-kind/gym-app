import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { NavButton, Page } from '../../components/Page'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/Dialogs'
import { Sheet } from '../../components/Sheet'
import { attempt } from '../../components/attempt'
import { useNow } from '../../components/useNow'
import { deleteSet, discardSession, finishSession, getSessionView, logSet, updateSet } from '../../db/sessions'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatClock, formatDuration } from '../../lib/date'
import { buildSessionExercises, isBodyweightExercise, nextIncomplete, type LoggedSet, type SessionExercise } from '../../lib/session'
import { ExercisePickerSheet } from '../programs/ExercisePickerSheet'
import { clearAdhoc, loadAdhoc, saveAdhoc } from './adhoc'
import { clearRest, startRest } from './restTimerStore'
import { getSettings } from '../settings/settingsStore'
import { ExerciseCard } from './ExerciseCard'
import { SetConsole } from './SetConsole'
import { SetSheet } from './SetSheet'

export function SessionPage() {
  const sessionId = Number(useParams().sessionId)
  return <SessionScreen key={sessionId} sessionId={sessionId} />
}

type Dialog = { kind: 'add' } | { kind: 'finish' } | { kind: 'discard' } | { kind: 'edit'; set: LoggedSet; bodyweight: boolean }

function SessionScreen({ sessionId }: { sessionId: number }) {
  const navigate = useNavigate()
  const [adhoc, setAdhoc] = useState<number[]>(() => loadAdhoc(sessionId))
  const view = useLiveQuery(() => getSessionView(sessionId, adhoc), [sessionId, adhoc])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const now = useNow(30_000)
  const cards = useRef(new Map<number, HTMLElement>())
  const close = () => setDialog(null)

  if (view === undefined) return <Page title="" />
  if (view === null) return <Navigate to="/train" replace />
  if (view.session.finishedAt !== undefined) return <Navigate to="/train" replace />

  const exercises = buildSessionExercises(
    view.plan,
    view.sets,
    adhoc.map((id) => ({ exerciseId: id, name: view.exercises.get(id)?.name ?? 'Unknown exercise' })),
    (id) => view.exercises.get(id)?.name ?? 'Unknown exercise',
  )
  const active = exercises.find((e) => e.exerciseId === activeId) ?? exercises[nextIncomplete(exercises)] ?? exercises[0]
  const previousOf = (e: SessionExercise) => view.previous.get(e.exerciseId)?.sets ?? []
  const bodyweightOf = (e: SessionExercise) => isBodyweightExercise(e.plan?.targetWeight, e.plan !== undefined, previousOf(e))
  const workingSets = view.sets.filter((s) => !s.isWarmup).length

  const focus = (exerciseId: number) => {
    setActiveId(exerciseId)
    requestAnimationFrame(() => cards.current.get(exerciseId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  const log = async (e: SessionExercise, values: { weight: number; reps: number; isWarmup: boolean }) => {
    const saved = await attempt(() => logSet({ sessionId, exerciseId: e.exerciseId, ...values }))
    if (!saved) return
    startRest(e.plan?.restSeconds ?? getSettings().defaultRestSeconds, { sessionId, exerciseName: e.name })
    // Move on once the planned sets for this exercise are done.
    if (!values.isWarmup && e.plan && e.workingSets + 1 >= e.plan.targetSets) {
      const index = exercises.indexOf(e)
      const updated = exercises.map((x) => (x === e ? { ...x, workingSets: x.workingSets + 1, done: true } : x))
      const next = nextIncomplete(updated, index + 1)
      if (next !== -1 && next !== index) focus(updated[next]!.exerciseId)
      else setActiveId(e.exerciseId)
    }
  }

  const end = async (action: () => Promise<void>) => {
    if (!(await attempt(action))) return
    clearAdhoc(sessionId)
    clearRest()
    void navigate('/train', { replace: true })
  }

  const subtitle = [view.program?.name, `Started ${formatClock(view.session.startedAt)}`, formatDuration(now - view.session.startedAt)]
    .filter(Boolean)
    .join(' · ')

  return (
    <Page title={view.day?.name ?? 'Workout'} action={<NavButton bold onClick={() => setDialog({ kind: 'finish' })}>Finish</NavButton>}>
      <p className="-mt-3 mb-4 text-[15px] text-label-2 tabular-nums">{subtitle}</p>

      {exercises.length === 0 && <p className="mb-6 px-1 text-label-2">No exercises yet. Add one below.</p>}
      {exercises.map((e) => (
        <ExerciseCard
          key={e.exerciseId}
          ref={(el) => {
            if (el) cards.current.set(e.exerciseId, el)
            else cards.current.delete(e.exerciseId)
          }}
          exercise={e}
          active={e === active}
          previous={previousOf(e)}
          bodyweight={bodyweightOf(e)}
          onActivate={() => setActiveId(e.exerciseId)}
          onEditSet={(set) => setDialog({ kind: 'edit', set, bodyweight: bodyweightOf(e) })}
        />
      ))}

      <div className="mt-2 mb-4 flex flex-col gap-3">
        <Button variant="secondary" onClick={() => setDialog({ kind: 'add' })}>
          Add exercise
        </Button>
        <Button onClick={() => setDialog({ kind: 'finish' })}>Finish workout</Button>
        <Button variant="danger" onClick={() => setDialog({ kind: 'discard' })}>
          Discard workout
        </Button>
      </div>

      {active && (
        <SetConsole
          key={`${active.exerciseId}:${active.sets.length}`}
          exercise={active}
          previous={previousOf(active)}
          bodyweight={bodyweightOf(active)}
          onLog={(values) => log(active, values)}
        />
      )}

      {dialog?.kind === 'add' && (
        <ExercisePickerSheet
          excludeIds={exercises.map((e) => e.exerciseId)}
          onClose={close}
          onPick={(exerciseId) => {
            if (!exercises.some((e) => e.exerciseId === exerciseId)) {
              const next = [...adhoc, exerciseId]
              setAdhoc(next)
              saveAdhoc(sessionId, next)
            }
            close()
            focus(exerciseId)
          }}
        />
      )}
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
      {dialog?.kind === 'finish' &&
        (workingSets === 0 ? (
          <ConfirmSheet
            title="Nothing logged"
            message="No sets have been logged in this workout. Discard it?"
            confirmLabel="Discard workout"
            onClose={close}
            onConfirm={() => end(() => discardSession(sessionId))}
          />
        ) : (
          <FinishSheet
            setCount={workingSets}
            exerciseCount={exercises.filter((e) => e.workingSets > 0).length}
            short={exercises.filter((e) => e.plan && !e.done).map((e) => e.name)}
            duration={formatDuration(now - view.session.startedAt)}
            onClose={close}
            onFinish={() => end(() => finishSession(sessionId))}
          />
        ))}
      {dialog?.kind === 'discard' && (
        <ConfirmSheet
          title="Discard workout?"
          message={`This deletes the workout and its ${view.sets.length} logged ${view.sets.length === 1 ? 'set' : 'sets'}. This can’t be undone.`}
          confirmLabel="Discard workout"
          onClose={close}
          onConfirm={() => end(() => discardSession(sessionId))}
        />
      )}
    </Page>
  )
}


function FinishSheet({
  setCount,
  exerciseCount,
  short,
  duration,
  onFinish,
  onClose,
}: {
  setCount: number
  exerciseCount: number
  short: string[]
  duration: string
  onFinish: () => Promise<void>
  onClose: () => void
}) {
  return (
    <Sheet title="Finish workout?" onClose={onClose}>
      <p className="mb-2 px-1">
        {setCount} {setCount === 1 ? 'set' : 'sets'} across {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'} · {duration}
      </p>
      {short.length > 0 && <p className="mb-2 px-1 text-[15px] text-label-2">Fewer sets than planned: {short.join(', ')}.</p>}
      <Button className="mt-2 mb-2" onClick={() => void onFinish()}>
        Finish workout
      </Button>
    </Sheet>
  )
}
