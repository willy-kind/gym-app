import type { ReactNode } from 'react'

/** iOS-style screen: large title under the status bar, content below. */
export function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      className="px-4 pb-6"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
    >
      <h1 className="mb-4 text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  )
}

export function Placeholder({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface p-4 text-label-2">{children}</p>
}
