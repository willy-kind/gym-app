import { useState } from 'react'
import { Page } from '../../components/Page'
import { LinkRow, ListGroup } from '../../components/List'
import { Button } from '../../components/Button'
import { listHistory } from '../../db/history'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatClock, formatDay, formatDuration } from '../../lib/date'
import { groupByMonth } from '../../lib/history'

const PAGE_SIZE = 30

export function HistoryPage() {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const data = useLiveQuery(() => listHistory(limit), [limit])

  if (!data) return <Page title="History" />
  const groups = groupByMonth(data.items, (i) => i.session.startedAt)

  return (
    <Page title="History">
      {data.active && (
        <ListGroup>
          <LinkRow to={`/train/session/${data.active.id}`} title="Workout in progress" subtitle={`Started ${formatClock(data.active.startedAt)}`} />
        </ListGroup>
      )}
      {data.items.length === 0 && <p className="mb-6 px-1 text-label-2">No finished workouts yet. They’ll appear here after you tap Finish.</p>}
      {groups.map((g) => (
        <ListGroup key={g.key} header={g.label}>
          {g.items.map(({ session, title, stats }) => (
            <LinkRow
              key={session.id}
              to={`/history/${session.id}`}
              title={title}
              subtitle={[
                formatDay(session.startedAt),
                formatDuration((session.finishedAt ?? session.startedAt) - session.startedAt),
                `${stats.workingSets} ${stats.workingSets === 1 ? 'set' : 'sets'}`,
              ].join(' · ')}
            />
          ))}
        </ListGroup>
      ))}
      {data.items.length < data.total && (
        <Button variant="secondary" className="mb-4" onClick={() => setLimit(limit + PAGE_SIZE)}>
          Show more ({data.total - data.items.length} older)
        </Button>
      )}
    </Page>
  )
}
