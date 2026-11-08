/** Weight for display; 0 means bodyweight and is shown as "BW". */
export function formatWeight(kg: number): string {
  if (kg === 0) return 'BW'
  return `${Number(kg.toFixed(2))} kg`
}
