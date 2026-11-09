import { useState } from 'react'
import { useParams } from 'react-router'
import { Page, Placeholder } from '../../components/Page'
import { getExerciseProgress } from '../../db/progress'
import { useLiveQuery } from '../../db/useLiveQuery'
import { useNow } from '../../components/useNow'
import { formatDay } from '../../lib/date'
import { formatVolume, formatWeight } from '../../lib/format'
import { filterRange, isBodyweightOnly, RANGES, summarize, type ProgressPoint, type RangeKey } from '../../lib/progress'
import { LineChartCard, type ChartPoint } from './LineChartCard'

interface Metric {
  title: string
  value: (p: ProgressPoint) => number
  label: (p: ProgressPoint) => string
  format: (v: number) => string
  unit: string
}

const kg = (v: number) => formatWeight(v)
const reps = (v: number) => `${v} ${v === 1 ? 'rep' : 'reps'}`

const WEIGHTED: Metric[] = [
  { title: 'Top set', value: (p) => p.topWeight, label: (p) => `${formatWeight(p.topWeight)} × ${p.topReps}`, format: kg, unit: 'kg' },
  { title: 'Estimated 1RM', value: (p) => p.e1rm, label: (p) => `${formatWeight(p.e1rm)} (from best set)`, format: kg, unit: 'kg' },
  { title: 'Volume', value: (p) => p.volume, label: (p) => formatVolume(p.volume), format: (v) => formatVolume(v), unit: 'kg' },
]

// Pure bodyweight: weight-based charts would sit flat at 0, so chart reps instead.
const BODYWEIGHT: Metric[] = [
  { title: 'Most reps in a set', value: (p) => p.bestReps, label: (p) => reps(p.bestReps), format: reps, unit: 'reps' },
  { title: 'Total reps', value: (p) => p.totalReps, label: (p) => reps(p.totalReps), format: reps, unit: 'reps' },
]

function signed(n: number, format: (v: number) => string) {
  if (n === 0) return 'no change'
  return `${n > 0 ? '+' : '−'}${format(Math.abs(n))}`
}

export default function ExerciseProgressPage() {
  const exerciseId = Number(useParams().exerciseId)
  const data = useLiveQuery(() => getExerciseProgress(exerciseId), [exerciseId])
  const [range, setRange] = useState<RangeKey>('6m')
  const [showTable, setShowTable] = useState(false)
  const now = useNow(60_000)
  const back = { to: '/progress', label: 'Progress' }

  if (data === undefined) return <Page title="" back={back} />
  if (data === null) {
    return (
      <Page title="Not found" back={back}>
        <Placeholder>This exercise no longer exists.</Placeholder>
      </Page>
    )
  }

  const points = filterRange(data.points, range, now)
  const metrics = isBodyweightOnly(data.points) ? BODYWEIGHT : WEIGHTED

  return (
    <Page title={data.exercise.name} back={back}>
      {/* One filter row, above everything it scopes. */}
      <div role="radiogroup" aria-label="Time range" className="mb-4 flex rounded-xl bg-surface-2 p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={range === r.key}
            onClick={() => setRange(r.key)}
            className={`min-h-11 flex-1 rounded-lg text-[15px] font-semibold ${range === r.key ? 'bg-surface text-label shadow' : 'text-label-2'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {metrics.map((m) => {
        const series: ChartPoint[] = points.map((p) => ({ date: p.date, value: m.value(p), label: m.label(p) }))
        const s = summarize(series)
        const summary = s
          ? [`Best ${m.format(s.best)} (${formatDay(s.bestDate)})`, s.change !== null ? `${signed(s.change, m.format)} in this period` : null].filter(Boolean).join(' · ')
          : null
        return <LineChartCard key={m.title} title={m.title} points={series} summary={summary} formatValue={m.format} />
      })}

      <button type="button" onClick={() => setShowTable(!showTable)} className="mb-3 min-h-11 px-1 text-[17px] text-accent">
        {showTable ? 'Hide table' : 'Show as table'}
      </button>
      {showTable && (
        <div className="mb-6 overflow-x-auto rounded-xl bg-surface">
          <table className="w-full text-left text-[15px] tabular-nums">
            <thead className="text-[13px] text-label-2">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                {metrics.map((m) => (
                  <th key={m.title} className="px-3 py-2 text-right font-medium">
                    {m.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-separator">
              {[...points].reverse().map((p) => (
                <tr key={p.sessionId}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDay(p.date)}</td>
                  {metrics.map((m) => (
                    <td key={m.title} className="px-3 py-2 text-right whitespace-nowrap">
                      {m.label(p).replace(' (from best set)', '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {points.length === 0 && <p className="px-3 py-4 text-label-2">No sets in this period.</p>}
        </div>
      )}
    </Page>
  )
}
