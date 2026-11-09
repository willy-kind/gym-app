/** Per-exercise progress metrics, one point per session. */

export interface ProgressSet {
  sessionId: number
  /** When the session started; the point's date. */
  date: number
  weight: number
  reps: number
  isWarmup: boolean
}

export interface ProgressPoint {
  sessionId: number
  date: number
  /** Heaviest working set (most reps breaks a tie). */
  topWeight: number
  topReps: number
  /** Best Epley estimate over the session's working sets. */
  e1rm: number
  /** Σ weight × reps over working sets. */
  volume: number
  /** For bodyweight exercises: most reps in one set, and total reps. */
  bestReps: number
  totalReps: number
}

/** Epley estimated one-rep max: w × (1 + reps / 30), to 0.1 kg. */
export function epley(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

/** One point per session, oldest first. Warm-ups are ignored; sessions with only warm-ups are dropped. */
export function progressPoints(sets: readonly ProgressSet[]): ProgressPoint[] {
  const bySession = new Map<number, ProgressSet[]>()
  for (const s of sets) {
    if (s.isWarmup) continue
    const list = bySession.get(s.sessionId) ?? []
    list.push(s)
    bySession.set(s.sessionId, list)
  }
  return [...bySession.entries()]
    .map(([sessionId, list]) => {
      const top = list.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a))
      return {
        sessionId,
        date: list[0]!.date,
        topWeight: top.weight,
        topReps: top.reps,
        e1rm: Math.max(...list.map((s) => epley(s.weight, s.reps))),
        volume: Math.round(list.reduce((sum, s) => sum + s.weight * s.reps, 0) * 100) / 100,
        bestReps: Math.max(...list.map((s) => s.reps)),
        totalReps: list.reduce((sum, s) => sum + s.reps, 0),
      }
    })
    .sort((a, b) => a.date - b.date)
}

/** True when every set is at bodyweight with no extra load, so weight-based charts would be flat at 0. */
export function isBodyweightOnly(points: readonly ProgressPoint[]): boolean {
  return points.length > 0 && points.every((p) => p.topWeight === 0)
}

export type RangeKey = '3m' | '6m' | '1y' | 'all'

export const RANGES: { key: RangeKey; label: string; days?: number }[] = [
  { key: '3m', label: '3M', days: 91 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'All' },
]

export function filterRange<T extends { date: number }>(points: readonly T[], range: RangeKey, now: number): T[] {
  const days = RANGES.find((r) => r.key === range)?.days
  if (days === undefined) return [...points]
  const from = now - days * 24 * 3600_000
  return points.filter((p) => p.date >= from)
}

export interface MetricSummary {
  latest: number
  best: number
  bestDate: number
  /** latest − first in the range; null with fewer than two points. */
  change: number | null
}

export function summarize(points: readonly { date: number; value: number }[]): MetricSummary | null {
  if (points.length === 0) return null
  const best = points.reduce((a, b) => (b.value > a.value ? b : a))
  const latest = points.at(-1)!.value
  return {
    latest,
    best: best.value,
    bestDate: best.date,
    change: points.length < 2 ? null : Math.round((latest - points[0]!.value) * 10) / 10,
  }
}
