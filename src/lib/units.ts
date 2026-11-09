/** Weights are always stored in kg; these convert for display and entry only. */

export type WeightUnit = 'kg' | 'lb'

export const KG_PER_LB = 0.45359237

/** kg → number shown to the user: kg to 0.01, lb to 0.1. */
export function toDisplay(kg: number, unit: WeightUnit): number {
  if (unit === 'kg') return Math.round(kg * 100) / 100
  return Math.round((kg / KG_PER_LB) * 10) / 10
}

/** Number typed by the user → kg to store. lb keeps 3 decimals so it converts back exactly. */
export function fromDisplay(value: number, unit: WeightUnit): number {
  if (unit === 'kg') return value
  return Math.round(value * KG_PER_LB * 1000) / 1000
}

/** Stepper increment in the display unit. */
export function weightStep(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5
}

/** "80 kg", "176.4 lb" (no bodyweight handling). */
export function formatMass(kg: number, unit: WeightUnit): string {
  return `${toDisplay(kg, unit)} ${unit}`
}
