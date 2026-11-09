import { describe, expect, it } from 'vitest'
import { computeAppHeight, keepsKeyboardOpen } from './viewport'

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

describe('computeAppHeight', () => {
  const iphone16 = { standalone: true, portrait: true, screenHeight: 852, innerHeight: 793, safeAreaTop: 59 }

  it('uses the screen height when iOS reports a viewport short by the top inset', () => {
    expect(computeAppHeight(iphone16)).toBe(852)
    expect(computeAppHeight({ ...iphone16, innerHeight: 794 })).toBe(852) // within 2px
  })

  it('trusts innerHeight when the viewport is already full height', () => {
    expect(computeAppHeight({ ...iphone16, innerHeight: 852 })).toBe(852)
  })

  it('trusts innerHeight in Safari, in landscape, with the keyboard open, or with no inset', () => {
    expect(computeAppHeight({ ...iphone16, standalone: false })).toBe(793)
    expect(computeAppHeight({ ...iphone16, portrait: false, innerHeight: 393 })).toBe(393)
    expect(computeAppHeight({ ...iphone16, innerHeight: 500 })).toBe(500)
    expect(computeAppHeight({ ...iphone16, safeAreaTop: 0 })).toBe(793)
  })
})
