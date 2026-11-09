import type { ReactNode } from 'react'
import { Link } from 'react-router'

export interface PageProps {
  title: string
  /** Back link shown top-left, e.g. { to: '/programs', label: 'Programs' }. */
  back?: { to: string; label: string }
  /** Top-right nav bar button(s), e.g. Edit / Done. */
  action?: ReactNode
  children?: ReactNode
}

/**
 * iOS-style screen: a sticky nav bar under the status bar (back / action),
 * then a large title, then content.
 */
export function Page({ title, back, action, children }: PageProps) {
  return (
    <div className="min-h-full">
      <header
        className="sticky top-0 z-10 bg-bg/85 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <div className="flex h-11 items-center justify-between px-1">
          {back ? (
            <Link to={back.to} className="flex min-h-11 min-w-11 items-center pr-3 text-[17px] text-accent">
              <svg viewBox="0 0 12 20" width="12" height="20" className="mx-1.5" aria-hidden="true">
                <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="max-w-[40vw] truncate">{back.label}</span>
            </Link>
          ) : (
            <span />
          )}
          <div className="flex items-center">{action}</div>
        </div>
      </header>
      <div className="pb-6" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
        <h1 className="mb-4 text-[34px] leading-tight font-bold tracking-tight break-words">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export function Placeholder({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface p-4 text-label-2">{children}</p>
}

/** Text button for the nav bar (Edit, Done, …). */
export function NavButton({ onClick, children, bold }: { onClick: () => void; children: ReactNode; bold?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-11 min-w-11 px-3 text-[17px] text-accent ${bold ? 'font-semibold' : ''}`}>
      {children}
    </button>
  )
}
