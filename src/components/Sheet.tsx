import { useEffect, type ReactNode } from 'react'
import { useKeyboardInset } from './useKeyboardInset'

export interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet modal. Tapping the backdrop or Cancel closes it. */
export function Sheet({ title, onClose, children }: SheetProps) {
  const keyboard = useKeyboardInset()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="app-height fixed inset-x-0 top-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative flex max-h-[90dvh] flex-col rounded-t-2xl bg-surface"
        style={{ marginBottom: keyboard, paddingBottom: keyboard ? 12 : 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-separator px-1">
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 px-3 text-[17px] text-accent">
            Cancel
          </button>
          <h2 className="truncate px-2 text-[17px] font-semibold">{title}</h2>
          <span className="min-w-11 px-3" />
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pt-4">{children}</div>
      </div>
    </div>
  )
}
