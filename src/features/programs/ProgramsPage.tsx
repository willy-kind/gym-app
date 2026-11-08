import { useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { loadProgramOverview, type ProgramOverview } from '../../db/programs'
import { formatWeight } from '../../lib/format'

/** Read-only view of the seeded programs. Editing arrives in feature 2. */
export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramOverview[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadProgramOverview().then((p) => {
      if (!cancelled) setPrograms(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Page title="Programs">
      {programs?.map((p) => (
        <section key={p.id} className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">{p.name}</h2>
          {p.days.map((d) => (
            <div key={d.id} className="mb-4">
              <h3 className="mb-1 px-4 text-[13px] text-label-2 uppercase">{d.name}</h3>
              <ul className="divide-y divide-separator overflow-hidden rounded-xl bg-surface">
                {d.exercises.map((e) => (
                  <li key={e.id} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5">
                    <span>{e.name}</span>
                    <span className="shrink-0 text-label-2 tabular-nums">
                      {e.targetSets} × {e.targetReps} · {formatWeight(e.targetWeight ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </Page>
  )
}
