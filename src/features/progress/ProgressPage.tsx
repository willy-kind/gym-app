import { useState } from 'react'
import { Button } from '../../components/Button'
import { NavButton, Page } from '../../components/Page'
import { ButtonRow, EditRow, LinkRow, ListGroup } from '../../components/List'
import { listTrainedExercises, type TrainedExercise } from '../../db/progress'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatDay } from '../../lib/date'
import { formatWeight } from '../../lib/format'
import { moveItem } from '../../lib/order'
import { arrangeProgress } from '../../lib/progressList'
import { updateSettings, useSettings, useUnit } from '../settings/settingsStore'

/**
 * Exercises you've trained; tap one for its charts. By default all of them,
 * most recent first; with Edit you choose which to show and in what order.
 */
export function ProgressPage() {
  const list = useLiveQuery(listTrainedExercises, [])
  const { progressExercises } = useSettings()
  const [editing, setEditing] = useState(false)
  const { shown, hidden } = arrangeProgress(list ?? [], progressExercises)
  const custom = progressExercises !== undefined
  const save = (items: TrainedExercise[]) => updateSettings({ progressExercises: items.map((t) => t.exercise.id) })

  return (
    <Page
      title="Progress"
      action={list && list.length > 0 && <NavButton bold={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</NavButton>}
    >
      {list && list.length === 0 && <p className="mb-6 px-1 text-label-2">Charts appear here once you’ve logged some sets.</p>}

      {editing ? (
        <>
          {shown.length === 0 ? (
            <p className="mb-6 px-1 text-label-2">No exercises shown. Add some from the list below.</p>
          ) : (
            <ListGroup header="Shown" footer="Use the arrows to change the order; the red button hides an exercise.">
              {shown.map((t, i) => (
                <EditRow
                  key={t.exercise.id}
                  title={t.exercise.name}
                  onDelete={() => save(shown.filter((_, j) => j !== i))}
                  onUp={i > 0 ? () => save(moveItem(shown, i, -1)) : undefined}
                  onDown={i < shown.length - 1 ? () => save(moveItem(shown, i, 1)) : undefined}
                />
              ))}
            </ListGroup>
          )}
          {hidden.length > 0 && (
            <ListGroup header="Hidden" footer="Tap one to show it at the end of the list.">
              {hidden.map((t) => (
                <ButtonRow key={t.exercise.id} title={t.exercise.name} detail={<span className="text-accent">Show</span>} onClick={() => save([...shown, t])} />
              ))}
            </ListGroup>
          )}
          {custom && (
            <Button variant="secondary" className="mb-6" onClick={() => updateSettings({ progressExercises: undefined })}>
              Show all, most recent first
            </Button>
          )}
        </>
      ) : (
        list &&
        list.length > 0 &&
        (shown.length === 0 ? (
          <p className="mb-6 px-1 text-label-2">All exercises are hidden. Tap Edit to choose which to show.</p>
        ) : (
          <ListGroup footer={custom ? (hidden.length > 0 ? `${hidden.length} hidden. Tap Edit to change.` : 'Your order. Tap Edit to change.') : 'Most recently trained first. Tap Edit to choose and order.'}>
            {shown.map((t) => (
              <ProgressRow key={t.exercise.id} item={t} />
            ))}
          </ListGroup>
        ))
      )}
    </Page>
  )
}

function ProgressRow({ item: { exercise, lastDate, sessions, bestE1rm, bestReps } }: { item: TrainedExercise }) {
  const unit = useUnit()
  return (
    <LinkRow
      to={`/progress/${exercise.id}`}
      title={exercise.name}
      subtitle={`Last: ${formatDay(lastDate)} · ${sessions} ${sessions === 1 ? 'session' : 'sessions'}`}
      detail={bestE1rm > 0 ? <Best value={formatWeight(bestE1rm, unit)} label="e1RM" /> : <Best value={`${bestReps} ${bestReps === 1 ? 'rep' : 'reps'}`} label="best set" />}
    />
  )
}

/** Right-hand value with a small caption under it. */
function Best({ value, label }: { value: string; label: string }) {
  return (
    <span className="block text-right">
      <span className="block font-semibold text-label">{value}</span>
      <span className="block text-[12px] text-label-2">{label}</span>
    </span>
  )
}
