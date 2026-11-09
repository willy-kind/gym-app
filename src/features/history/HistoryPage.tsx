import { useState } from 'react'
import { Link } from 'react-router'
import { useNow } from '../../components/useNow'
import { Page } from '../../components/Page'
import { LinkRow, ListGroup } from '../../components/List'
import { Button } from '../../components/Button'
import { listHistory } from '../../db/history'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatClock, formatDay, formatDuration } from '../../lib/date'
import { groupByMonth } from '../../lib/history'
import { ShareRecentSheet } from '../import-export/ShareWithAI'

const PAGE_SIZE = 30

export function HistoryPage() {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [sharing, setSharing] = useState(false)
  const data = useLiveQuery(() => listHistory(limit), [limit])
  const now = useNow(60_000)

  if (!data) return <Page title="History" />
  const groups = groupByMonth(data.items, (i) => i.session.startedAt)

  return (
    <Page title="History">
      {data.active && (
        <Link
          to={`/train/session/${data.active.id}`}
          className="mb-6 flex min-h-12 items-center gap-3 rounded-xl bg-surface px-4 py-2.5 shadow-[inset_0_0_0_1.5px_var(--accent)] active:opacity-70"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Workout in progress</span>
            <span className="block text-[15px] text-label-2 tabular-nums">
              {data.activeTitle} · Started {formatClock(data.active.startedAt)} · {formatDuration(now - data.active.startedAt)}
            </span>
          </span>
          <svg viewBox="0 0 8 14" width="8" height="14" className="shrink-0 text-label-2" aria-hidden="true">
            <path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
      {data.items.length > 0 && (
        <Button variant="secondary" className="mb-6" onClick={() => setSharing(true)}>
          Share with AI…
        </Button>
      )}
      {sharing && <ShareRecentSheet onClose={() => setSharing(false)} />}
      {data.items.length === 0 && <p className="mb-6 px-1 text-label-2">No finished workouts yet. They’ll appear here after you tap Finish.</p>}
      {groups.map((g) => (
        <ListGroup key={g.key} header={g.label}>
          {g.items.map(({ session, title, stats, prCount }) => (
            <LinkRow
              key={session.id}
              to={`/history/${session.id}`}
              title={title}
              subtitle={[
                formatDay(session.startedAt),
                formatDuration((session.finishedAt ?? session.startedAt) - session.startedAt),
                `${stats.workingSets} ${stats.workingSets === 1 ? 'set' : 'sets'}`,
              ].join(' · ')}
              detail={prCount > 0 ? <PRCount n={prCount} /> : undefined}
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

/** "↑ 2 PR": how many personal records a workout set. */
function PRCount({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-1 text-[12px] font-bold tracking-wide text-accent" aria-label={`${n} personal ${n === 1 ? 'record' : 'records'}`}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {n} PR
    </span>
  )
}
