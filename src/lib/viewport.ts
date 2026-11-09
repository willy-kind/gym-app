/** Input types that don't bring up the on-screen keyboard. */
const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

/**
 * True if focusing this element keeps the iOS keyboard open. Used to skip the
 * post-keyboard viewport fix while the user is just moving between fields.
 */
export function keepsKeyboardOpen(el: { tagName: string; type?: string; isContentEditable?: boolean } | null): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = el.tagName.toUpperCase()
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') return !NON_TEXT_INPUTS.has((el.type ?? 'text').toLowerCase())
  return false
}

/**
 * Height for the app shell. iOS standalone mode can report a layout viewport that
 * is exactly the top safe-area inset shorter than the screen (innerHeight 793 on an
 * 852pt screen with a 59pt inset), so every 100vh/dvh height stops short. In that
 * case use the screen height. Portrait only: iOS doesn't swap screen.height when
 * rotated.
 */
export function computeAppHeight(input: {
  standalone: boolean
  portrait: boolean
  screenHeight: number
  innerHeight: number
  safeAreaTop: number
}): number {
  const { standalone, portrait, screenHeight, innerHeight, safeAreaTop } = input
  const shortBy = screenHeight - innerHeight
  if (standalone && portrait && safeAreaTop > 0 && Math.abs(shortBy - safeAreaTop) <= 2) return screenHeight
  return innerHeight
}
