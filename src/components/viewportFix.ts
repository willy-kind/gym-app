import { keepsKeyboardOpen } from '../lib/viewport'

// iOS WebKit sometimes keeps a stale viewport after the keyboard closes (bottom
// bars float up, leaving a gap) or after launch/resume (safe-area insets read as
// 0, so the header slides under the Dynamic Island). Forcing a re-layout of the
// app shell makes it measure again.

const KEYBOARD_SETTLE_MS = 100

/** Scrollers whose position a display toggle would reset. */
function scrollers(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('main, [role=dialog] .overflow-y-auto')]
}

export function remeasureViewport() {
  const root = document.getElementById('root')
  if (!root) return
  // Undo any pan iOS left on the (non-scrollable) document for the keyboard.
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
  const saved = scrollers(root).map((el) => [el, el.scrollTop] as const)
  // Hide, force layout, show — all in one task, so nothing paints in between.
  const display = root.style.display
  root.style.display = 'none'
  void root.offsetHeight
  root.style.display = display
  for (const [el, top] of saved) el.scrollTop = top
}

export function installViewportFix() {
  let timer: ReturnType<typeof setTimeout> | undefined
  document.addEventListener(
    'focusout',
    () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        // Moving from one field to the next keeps the keyboard up; toggling
        // display now would blur the new field and close it.
        if (keepsKeyboardOpen(document.activeElement as HTMLElement | null)) return
        remeasureViewport()
      }, KEYBOARD_SETTLE_MS)
    },
    true,
  )
  window.addEventListener('pageshow', () => remeasureViewport())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !keepsKeyboardOpen(document.activeElement as HTMLElement | null)) remeasureViewport()
  })
}
