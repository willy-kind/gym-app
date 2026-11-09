import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxisDate, formatAxisNumber } from '../../lib/format'
import { formatDay } from '../../lib/date'
import { useThemeColors } from '../../components/useThemeColors'

export interface ChartPoint {
  date: number
  value: number
  /** Tooltip text, e.g. "85 kg × 6". */
  label: string
}

/** Dots on every point only while they stay readable; beyond this only the last point gets one. */
const MAX_DOTS = 30

/**
 * One measure over time: a single 2px line in the accent with a faint wash,
 * hairline grid, the latest value labelled at the end, and a crosshair tooltip.
 */
export function LineChartCard({
  title,
  points,
  summary,
  formatValue,
}: {
  title: string
  points: ChartPoint[]
  summary: string | null
  formatValue: (v: number) => string
}) {
  const spansYears = points.length > 1 && points.at(-1)!.date - points[0]!.date > 300 * 24 * 3600_000
  const last = points.length - 1
  const showAllDots = points.length <= MAX_DOTS
  const c = useThemeColors()

  return (
    <section className="card-edge mb-4 rounded-xl bg-surface px-3 pt-3 pb-2">
      <h2 className="px-1 text-[17px] font-semibold">{title}</h2>
      {summary && <p className="mb-1 px-1 text-[13px] text-label-2">{summary}</p>}
      {points.length === 0 ? (
        <p className="px-1 py-8 text-center text-label-2">No sets in this period.</p>
      ) : (
        <div className="h-48" aria-label={`${title} chart. The table below lists every value.`} role="img">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 12, right: 48, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={c.separator} strokeWidth={1} />
              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                padding={{ left: 12, right: 12 }}
                tickFormatter={(t: number) => formatAxisDate(t, spansYears)}
                tick={{ fill: c['label-2'], fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: c.separator }}
                tickCount={4}
                minTickGap={24}
              />
              <YAxis
                dataKey="value"
                domain={['auto', 'auto']}
                tickFormatter={formatAxisNumber}
                tick={{ fill: c['label-2'], fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickCount={4}
              />
              <Tooltip
                cursor={{ stroke: c['label-2'], strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const p = active ? (payload?.[0]?.payload as ChartPoint | undefined) : undefined
                  if (!p) return null
                  return (
                    <div className="rounded-lg bg-surface-2 px-3 py-2 shadow-lg">
                      <p className="text-[15px] font-semibold text-label">{p.label}</p>
                      <p className="text-[12px] text-label-2">{formatDay(p.date)}</p>
                    </div>
                  )
                }}
              />
              <Area dataKey="value" type="linear" stroke="none" fill={c.accent} fillOpacity={0.1} isAnimationActive={false} activeDot={false} />
              <Line
                dataKey="value"
                type="linear"
                stroke={c.accent}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; index?: number }) =>
                  showAllDots || props.index === last ? (
                    <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={c.accent} stroke={c.surface} strokeWidth={2} />
                  ) : (
                    <g key={props.index} />
                  )
                }
                activeDot={{ r: 6, fill: c.accent, stroke: c.surface, strokeWidth: 2 }}
                label={(props: { x?: number | string; y?: number | string; index?: number; value?: unknown }) =>
                  props.index === last ? (
                    <text key="end" x={Number(props.x) + 8} y={Number(props.y)} dy={4} fill={c.label} fontSize={13} fontWeight={600}>
                      {formatValue(Number(props.value))}
                    </text>
                  ) : (
                    <g key={props.index} />
                  )
                }
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
