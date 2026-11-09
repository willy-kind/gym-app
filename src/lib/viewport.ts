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

