import { describe, expect, it } from 'vitest'
import { formatMass, fromDisplay, stepWeight, toDisplay, weightStep } from './units'

describe('units', () => {
  it('leaves kg alone, rounded to 0.01', () => {
    expect(toDisplay(61.25, 'kg')).toBe(61.25)
    expect(fromDisplay(61.25, 'kg')).toBe(61.25)
  })

  it('converts kg to lb to 0.1', () => {
    expect(toDisplay(100, 'lb')).toBe(220.5)
    expect(toDisplay(20, 'lb')).toBe(44.1)
    expect(toDisplay(0, 'lb')).toBe(0)
  })

  it('round-trips typed lb values exactly', () => {
    for (const lb of [5, 45, 135, 137.5, 225, 315, 405.5]) expect(toDisplay(fromDisplay(lb, 'lb'), 'lb')).toBe(lb)
  })

  it('round-trips the kg plate steps shown in lb back to the same lb', () => {
    for (let kg = 0; kg <= 200; kg += 2.5) {
      const shown = toDisplay(kg, 'lb')
      expect(toDisplay(fromDisplay(shown, 'lb'), 'lb')).toBe(shown)
    }
  })

  it('steps and formats per unit', () => {
    expect(weightStep('kg')).toBe(2.5)
    expect(weightStep('lb')).toBe(5)
    expect(formatMass(80, 'kg')).toBe('80 kg')
    expect(formatMass(80, 'lb')).toBe('176.4 lb')
  })
})

describe('stepWeight', () => {
  it('moves kg by 2.5 without snapping', () => {
    expect(stepWeight(80, 1, 'kg')).toBe(82.5)
    expect(stepWeight(61.25, 1, 'kg')).toBe(63.75)
    expect(stepWeight(61.25, -1, 'kg')).toBe(58.75)
    expect(stepWeight(1, -1, 'kg')).toBe(0)
  })

  it('snaps lb to the 5 lb grid', () => {
    expect(stepWeight(187.4, 1, 'lb')).toBe(190)
    expect(stepWeight(187.4, -1, 'lb')).toBe(185)
    expect(stepWeight(185, 1, 'lb')).toBe(190)
    expect(stepWeight(185, -1, 'lb')).toBe(180)
    expect(stepWeight(135, 1, 'lb')).toBe(140)
    expect(stepWeight(2.2, -1, 'lb')).toBe(0)
    expect(stepWeight(0, -1, 'lb')).toBe(0)
    expect(stepWeight(0, 1, 'lb')).toBe(5)
  })
})
