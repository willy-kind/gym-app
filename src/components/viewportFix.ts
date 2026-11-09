import { computeAppHeight, keepsKeyboardOpen } from '../lib/viewport'

// iOS WebKit sometimes keeps a stale viewport after the keyboard closes (bottom
// bars float up, leaving a gap) or after launch/resume (safe-area insets read as
// 0, so the header slides under the Dynamic Island). Forcing a re-layout of the
// app shell makes it measure again.

const KEYBOARD_SETTLE_MS = 100

/** Scrollers whose position a display toggle would reset. */
function scrollers(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('main, [role=dialog] .overflow-y-auto')]
}

/** Reads env(safe-area-inset-*) by applying them as padding to a hidden element. */
export function safeAreaInsets(): { top: number; bottom: number } {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const result = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }
  probe.remove()
  return result
}

/**
 * Sets --app-height on <html> for the shell and sheets. iOS standalone can report
 * a viewport one status-bar height short of the screen; see computeAppHeight.
 */
export function updateAppHeight() {
  const height = computeAppHeight({
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    portrait: window.matchMedia('(orientation: portrait)').matches,
    screenHeight: screen.height,
    innerHeight: window.innerHeight,
    safeAreaTop: safeAreaInsets().top,
  })
  document.documentElement.style.setProperty('--app-height', `${height}px`)
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
  updateAppHeight()
}

export function installViewportFix() {
  updateAppHeight()
  window.addEventListener('resize', updateAppHeight)
  window.addEventListener('orientationchange', updateAppHeight)
  window.visualViewport?.addEventListener('resize', updateAppHeight)
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
