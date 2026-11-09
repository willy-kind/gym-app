import { formatRest } from './targets'

/** Weight for display; 0 means bodyweight and is shown as "BW". */
export function formatWeight(kg: number): string {
  if (kg === 0) return 'BW'
  return `${Number(kg.toFixed(2))} kg`
}

/** "4 × 6-7 · 75 kg · 3:00 rest" */
export function formatTargetSummary(t: { targetSets: number; targetReps: string; targetWeight?: number; restSeconds: number }): string {
  return `${t.targetSets} × ${t.targetReps} · ${formatWeight(t.targetWeight ?? 0)} · ${formatRest(t.restSeconds)} rest`
}


/** "12,340 kg" */
export function formatVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString('en-GB')} kg`
}
