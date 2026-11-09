import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
)

const tabs = [
  {
    to: '/train',
    label: 'Train',
    icon: icon(<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />),
  },
  {
    to: '/programs',
    label: 'Programs',
    icon: icon(<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />),
  },
  {
    to: '/history',
    label: 'History',
    icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  },
  {
    to: '/progress',
    label: 'Progress',
    icon: icon(<path d="M3 20h18M5 16l4-5 4 3 6-8" />),
  },
]

export function TabBar() {
  return (
    <nav
      className="border-t border-separator bg-bar"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))' }}
    >
      <ul className="flex gap-1 pt-1.5 pb-1">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] py-1 text-[11px] font-semibold ${isActive ? 'bg-surface-2 text-accent' : 'text-label-2'}`
              }
            >
              {t.icon}
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
