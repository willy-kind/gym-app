import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** Inset grouped list, as in iOS Settings. */
export function ListGroup({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      {header && <h2 className="mb-1.5 px-4 text-[13px] text-label-2 uppercase">{header}</h2>}
      <ul className="divide-y divide-separator overflow-hidden rounded-xl bg-surface">{children}</ul>
      {footer && <p className="mt-1.5 px-4 text-[13px] text-label-2">{footer}</p>}
    </section>
  )
}

interface RowContentProps {
  title: ReactNode
  subtitle?: ReactNode
  detail?: ReactNode
}

function RowContent({ title, subtitle, detail }: RowContentProps) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block break-words">{title}</span>
        {subtitle && <span className="block text-[15px] text-label-2 tabular-nums">{subtitle}</span>}
      </span>
      {detail && <span className="shrink-0 text-label-2 tabular-nums">{detail}</span>}
    </>
  )
}

const rowClass = 'flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2'

const Chevron = () => (
  <svg viewBox="0 0 8 14" width="8" height="14" className="shrink-0 text-label-2" aria-hidden="true">
    <path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function LinkRow({ to, ...content }: RowContentProps & { to: string }) {
  return (
    <li>
      <Link to={to} className={rowClass}>
        <RowContent {...content} />
        <Chevron />
      </Link>
    </li>
  )
}

export function ButtonRow({ onClick, danger, ...content }: RowContentProps & { onClick: () => void; danger?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={`${rowClass} ${danger ? 'text-danger' : ''}`}>
        <RowContent {...content} />
      </button>
    </li>
  )
}

/** A row in edit mode: delete on the left, move up/down on the right. */
export function EditRow({
  onDelete,
  onUp,
  onDown,
  onTap,
  ...content
}: RowContentProps & { onDelete: () => void; onUp?: () => void; onDown?: () => void; onTap?: () => void }) {
  return (
    <li className="flex min-h-12 items-center">
      <button type="button" aria-label="Delete" onClick={onDelete} className="flex h-12 w-12 shrink-0 items-center justify-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white">
          <span className="block h-0.5 w-3 rounded bg-white" />
        </span>
      </button>
      <button type="button" onClick={onTap} disabled={!onTap} className="flex min-h-12 min-w-0 flex-1 items-center py-2.5 text-left">
        <RowContent {...content} />
      </button>
      <MoveButton label="Move up" onClick={onUp} d="M3 10 8 5l5 5" />
      <MoveButton label="Move down" onClick={onDown} d="M3 6l5 5 5-5" />
    </li>
  )
}

function MoveButton({ label, onClick, d }: { label: string; onClick?: () => void; d: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={!onClick} className="flex h-12 w-12 shrink-0 items-center justify-center text-accent disabled:text-separator">
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
