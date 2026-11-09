/** "↑ PR" mark next to a set that was a personal record. */
export function PRBadge() {
  return (
    <span aria-label="Personal record" className="flex shrink-0 items-center gap-1 text-[12px] font-bold tracking-wide text-accent">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      PR
    </span>
  )
}
