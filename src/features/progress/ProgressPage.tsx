import { Page } from '../../components/Page'
import { LinkRow, ListGroup } from '../../components/List'
import { listTrainedExercises } from '../../db/progress'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatDay } from '../../lib/date'
import { formatWeight } from '../../lib/format'

/** Exercises you've trained, most recent first. Tap one for its charts. */
export function ProgressPage() {
  const list = useLiveQuery(listTrainedExercises, [])
  return (
    <Page title="Progress">
      {list && list.length === 0 && <p className="mb-6 px-1 text-label-2">Charts appear here once you’ve logged some sets.</p>}
      {list && list.length > 0 && (
        <ListGroup>
          {list.map(({ exercise, lastDate, sessions, bestE1rm }) => (
            <LinkRow
              key={exercise.id}
              to={`/progress/${exercise.id}`}
              title={exercise.name}
              subtitle={`Last: ${formatDay(lastDate)} · ${sessions} ${sessions === 1 ? 'session' : 'sessions'}`}
              detail={bestE1rm > 0 ? `e1RM ${formatWeight(bestE1rm)}` : undefined}
            />
          ))}
        </ListGroup>
      )}
    </Page>
  )
}
