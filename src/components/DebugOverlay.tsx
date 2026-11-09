// TEMPORARY: layout diagnostics for the iPhone. Remove once the bottom band and
// gear glow are understood. Toggle: tap the "Train" title 3 times quickly.
import { useEffect, useState } from 'react'

const KEY = 'gym.debug'
const TAPS = 3
const TAP_WINDOW_MS = 800

function readEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function saveEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable: the toggle still works until the app is closed.
  }
}

/** Reads env(safe-area-inset-*) by applying them as padding to a hidden element. */
function safeAreaInsets(): { top: string; bottom: string } {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const result = { top: cs.paddingTop, bottom: cs.paddingBottom }
  probe.remove()
  return result
}

function styleSummary(el: Element | null, props: string[]): string {
  if (!el) return 'not found'
  const cs = getComputedStyle(el)
  return props.map((p) => `${p}: ${cs.getPropertyValue(p) || '—'}`).join('; ')
}

function measure(): string[] {
  const vv = window.visualViewport
  const shell = document.querySelector('#root > div')
  const tabBar = document.querySelector('nav')
  const insets = safeAreaInsets()
  const gear = document.querySelector('a[aria-label="Settings"]')
  const header = gear?.closest('header') ?? null
  const px = (n: number | undefined) => (n === undefined ? 'n/a' : `${Math.round(n * 10) / 10}`)
  return [
    `build: ${__APP_BUILD__}`,
    `standalone: ${window.matchMedia('(display-mode: standalone)').matches}`,
    `innerHeight: ${window.innerHeight}  clientHeight: ${document.documentElement.clientHeight}`,
    `visualViewport.height: ${px(vv?.height)}  offsetTop: ${px(vv?.offsetTop)}`,
    `screen.height: ${screen.height}  screen.width: ${screen.width}`,
    `shell height: ${shell ? getComputedStyle(shell).height : 'n/a'}`,
    `tab bar bottom: ${px(tabBar?.getBoundingClientRect().bottom)}`,
    `safe-area top: ${insets.top}  bottom: ${insets.bottom}`,
    `scrollY: ${window.scrollY}  sw: ${navigator.serviceWorker?.controller ? 'controlling' : 'none'}`,
    `gear <a>: ${styleSummary(gear, ['filter', 'box-shadow', 'text-shadow', 'outline-style', 'outline-color', 'transition-property', '-webkit-tap-highlight-color', 'color'])}`,
    `gear <svg>: ${styleSummary(gear?.querySelector('svg') ?? null, ['filter', 'stroke', 'stroke-width', 'width', 'height'])}`,
    `focused: ${document.activeElement?.tagName ?? 'none'}${document.activeElement === gear ? ' (gear)' : ''}`,
    `header: ${styleSummary(header, ['backdrop-filter', '-webkit-backdrop-filter', 'background-color'])}`,
  ]
}

export function DebugOverlay() {
  const [on, setOn] = useState(readEnabled)
  const [lines, setLines] = useState<string[]>([])

  // Triple-tap on the "Train" large title toggles the overlay.
  useEffect(() => {
    let taps: number[] = []
    const onClick = (e: MouseEvent) => {
      const h1 = (e.target as Element | null)?.closest?.('h1')
      if (!h1 || h1.textContent?.trim() !== 'Train') return
      const now = Date.now()
      taps = [...taps.filter((t) => now - t < TAP_WINDOW_MS), now]
      if (taps.length >= TAPS) {
        taps = []
        setOn((v) => {
          saveEnabled(!v)
          return !v
        })
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    if (!on) return
    const update = () => setLines(measure())
    update()
    const vv = window.visualViewport
    window.addEventListener('resize', update)
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    // Also catches route changes and late layout.
    const timer = setInterval(update, 1000)
    return () => {
      window.removeEventListener('resize', update)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      clearInterval(timer)
    }
  }, [on])

  if (!on) return null
  return (
    <div
      className="pointer-events-none fixed left-1 z-[9999] max-w-[calc(100vw-8px)] rounded-md bg-black/80 p-2 font-mono text-[10px] leading-snug break-words whitespace-pre-wrap text-lime-300"
      style={{ top: 'max(4px, env(safe-area-inset-top))' }}
    >
      {lines.join('\n')}
    </div>
  )
}
