import { formatRest } from './targets'
import { formatMass, toDisplay, type WeightUnit } from './units'

/** Weight for display; 0 means bodyweight and is shown as "BW". */
export function formatWeight(kg: number, unit: WeightUnit = 'kg'): string {
  if (kg === 0) return 'BW'
  return formatMass(kg, unit)
}

/** "4 × 6-7 · 75 kg · 3:00 rest" */
export function formatTargetSummary(
  t: { targetSets: number; targetReps: string; targetWeight?: number; restSeconds: number },
  unit: WeightUnit = 'kg',
): string {
  return `${t.targetSets} × ${t.targetReps} · ${formatWeight(t.targetWeight ?? 0, unit)} · ${formatRest(t.restSeconds)} rest`
}


/** "12,340 kg" */
export function formatVolume(kg: number, unit: WeightUnit = 'kg'): string {
  return `${Math.round(toDisplay(kg, unit)).toLocaleString('en-GB')} ${unit}`
}

/** Axis ticks: in full under 10,000 ("2,500"), compact above ("12K"). */
export function formatAxisNumber(n: number): string {
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}K`
  return Number(n.toFixed(1)).toLocaleString('en-GB')
}

/** Short date for a chart axis: "3 Nov", or "Nov 25" when the chart spans more than a year. */
export function formatAxisDate(timestamp: number, spansYears: boolean): string {
  const d = new Date(timestamp)
  if (spansYears) return `${d.toLocaleDateString('en-GB', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
