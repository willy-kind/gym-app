import type { Ref } from 'react'
import { formatSetsSummary, formatSetWeight, type LoggedSet, type SessionExercise, type SetValues } from '../../lib/session'
import { formatWeight } from '../../lib/format'
import { useUnit } from '../settings/settingsStore'
import type { Suggestion } from '../../lib/progression'
import { PRBadge } from '../../components/PRBadge'

/** One exercise in the session: target, last time, and the sets logged so far. Tap to make it the active one. */
export function ExerciseCard({
  ref,
  exercise,
  active,
  previous,
  bodyweight,
  suggestion,
  prSetIds,
  onActivate,
  onEditSet,
}: {
  ref?: Ref<HTMLElement>
  exercise: SessionExercise
  active: boolean
  previous: readonly SetValues[]
  bodyweight: boolean
  /** Progression step to show until the first working set is logged. */
  suggestion: Suggestion | null
  prSetIds: ReadonlySet<number>
  onActivate: () => void
  onEditSet: (set: LoggedSet) => void
}) {
  const { plan, sets, done } = exercise
  const unit = useUnit()
  const last = formatSetsSummary(previous, bodyweight, unit)
  let working = 0

  return (
    // Scroll margin keeps the card clear of the sticky set console when scrolled into view.
    <section ref={ref} className={`mb-3 scroll-mt-16 scroll-mb-64 overflow-hidden rounded-xl bg-surface ${active ? 'ring-2 ring-accent' : ''}`}>
      <button type="button" onClick={onActivate} className="flex min-h-12 w-full items-start gap-3 px-4 pt-3 pb-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold break-words">{exercise.name}</span>
          {plan && (
            <span className="block text-[15px] text-label-2 tabular-nums">
              {plan.targetSets} × {plan.targetReps} · {formatWeight(plan.targetWeight ?? 0, unit)}
            </span>
          )}
          <span className="block text-[15px] text-label-2 tabular-nums">{last ? `Last time: ${last}` : 'First time'}</span>
          {suggestion && exercise.workingSets === 0 && (
            <span className="block text-[15px] font-medium text-accent tabular-nums">
              Go up: {formatSetWeight(suggestion.weight, bodyweight, unit)} · hit {suggestion.reps} on all {suggestion.sets} sets
            </span>
          )}
        </span>
        {done && (
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white" aria-label="Done">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </button>
      {sets.length > 0 && (
        <ul className="divide-y divide-separator border-t border-separator">
          {sets.map((s) => {
            if (!s.isWarmup) working++
            return (
              <li key={s.id}>
                <button type="button" onClick={() => onEditSet(s)} className="flex min-h-11 w-full items-center gap-3 px-4 text-left tabular-nums active:bg-surface-2">
                  <span className={`w-7 text-[15px] font-semibold ${s.isWarmup ? 'text-label-2' : 'text-accent'}`}>{s.isWarmup ? 'W' : working}</span>
                  <span className="flex-1 text-[17px]">
                    {formatSetWeight(s.weight, bodyweight, unit)} × {s.reps}
                  </span>
                  {prSetIds.has(s.id) && <PRBadge />}
                  <span className="text-[13px] text-label-2">Edit</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
