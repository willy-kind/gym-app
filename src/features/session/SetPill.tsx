import { PRBadge } from '../../components/PRBadge'
import { formatSetWeight, type LoggedSet } from '../../lib/session'
import type { WeightUnit } from '../../lib/units'

/** One logged set as a rounded row: number (or W), weight × reps, PR mark. Tap to edit. */
export function SetPill({
  set,
  label,
  bodyweight,
  unit,
  pr,
  onEdit,
}: {
  set: LoggedSet
  /** "1", "2"… or "W" for a warm-up. */
  label: string
  bodyweight: boolean
  unit: WeightUnit
  pr: boolean
  onEdit: () => void
}) {
  const text = `${formatSetWeight(set.weight, bodyweight, unit)} × ${set.reps}`
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Edit set ${label}: ${text}${pr ? ', personal record' : ''}`}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-lg bg-surface-2 px-3 text-left tabular-nums active:opacity-70"
    >
      <span className="w-5 text-[14px] text-label-2">{label}</span>
      <span className="flex-1 text-[17px] font-semibold">{text}</span>
      {pr && <PRBadge />}
    </button>
  )
}
