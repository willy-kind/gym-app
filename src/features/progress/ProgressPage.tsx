import { Page } from '../../components/Page'
import { LinkRow, ListGroup } from '../../components/List'
import { listTrainedExercises } from '../../db/progress'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatDay } from '../../lib/date'
import { formatWeight } from '../../lib/format'
import { useUnit } from '../settings/settingsStore'

/** Exercises you've trained, most recent first. Tap one for its charts. */
export function ProgressPage() {
  const list = useLiveQuery(listTrainedExercises, [])
  const unit = useUnit()
  return (
    <Page title="Progress">
      {list && list.length === 0 && <p className="mb-6 px-1 text-label-2">Charts appear here once you’ve logged some sets.</p>}
      {list && list.length > 0 && (
        <ListGroup footer="Most recently trained first.">
          {list.map(({ exercise, lastDate, sessions, bestE1rm, bestReps }) => (
            <LinkRow
              key={exercise.id}
              to={`/progress/${exercise.id}`}
              title={exercise.name}
              subtitle={`Last: ${formatDay(lastDate)} · ${sessions} ${sessions === 1 ? 'session' : 'sessions'}`}
              detail={
                bestE1rm > 0 ? <Best value={formatWeight(bestE1rm, unit)} label="e1RM" /> : <Best value={`${bestReps} ${bestReps === 1 ? 'rep' : 'reps'}`} label="best set" />
              }
            />
          ))}
        </ListGroup>
      )}
    </Page>
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
