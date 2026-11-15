import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Height of the on-screen keyboard (iOS shrinks the visual viewport but not the layout viewport). */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    // visualViewport can miss the keyboard closing; check again once it has gone.
    let timer: ReturnType<typeof setTimeout> | undefined
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(update, 100)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('focusout', later)
    return () => {
      clearTimeout(timer)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('focusout', later)
    }
  }, [])
  return inset
}

/**
 * How far to raise an element (as translateY) so its bottom edge sits just above
 * the on-screen keyboard. 0 while the keyboard is closed or the element is already clear.
 */
export function useLiftAboveKeyboard(ref: RefObject<HTMLElement | null>): number {
  const keyboard = useKeyboardInset()
  const [lift, setLift] = useState(0)
  const applied = useRef(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || keyboard === 0) {
      applied.current = 0
      setLift(0)
      return
    }
    // Where the bottom would be without the current lift.
    const bottom = el.getBoundingClientRect().bottom + applied.current
    const next = Math.max(0, Math.round(bottom - (window.innerHeight - keyboard)))
    applied.current = next
    setLift(next)
  }, [keyboard, ref])
  return lift
}
