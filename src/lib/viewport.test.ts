import { describe, expect, it } from 'vitest'
import { keepsKeyboardOpen } from './viewport'

describe('keepsKeyboardOpen', () => {
  it('is true for text-entry fields', () => {
    expect(keepsKeyboardOpen({ tagName: 'INPUT', type: 'text' })).toBe(true)
    expect(keepsKeyboardOpen({ tagName: 'input' })).toBe(true)
    expect(keepsKeyboardOpen({ tagName: 'INPUT', type: 'datetime-local' })).toBe(true)
    expect(keepsKeyboardOpen({ tagName: 'TEXTAREA' })).toBe(true)
    expect(keepsKeyboardOpen({ tagName: 'SELECT' })).toBe(true)
    expect(keepsKeyboardOpen({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('is false for buttons, toggles and nothing focused', () => {
    expect(keepsKeyboardOpen(null)).toBe(false)
    expect(keepsKeyboardOpen({ tagName: 'BUTTON' })).toBe(false)
    expect(keepsKeyboardOpen({ tagName: 'BODY' })).toBe(false)
    expect(keepsKeyboardOpen({ tagName: 'INPUT', type: 'checkbox' })).toBe(false)
    expect(keepsKeyboardOpen({ tagName: 'INPUT', type: 'FILE' })).toBe(false)
  })
})
