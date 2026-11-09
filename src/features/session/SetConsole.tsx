import { useRef, useState } from 'react'
import { parseReps, parseWeight, weightInputText } from '../../lib/targets'
import { prefillSet, type SessionExercise, type SetValues } from '../../lib/session'
import { RepsInput, WarmupToggle, WeightInput } from './setFields'

/**
 * The set entry panel, pinned to the bottom of the screen for the active exercise.
 * Remounted (keyed by exercise and set count) after every logged set, so it prefills the next one.
 */
export function SetConsole({
  exercise,
  previous,
  bodyweight,
  onLog,
}: {
  exercise: SessionExercise
  previous: readonly SetValues[]
  bodyweight: boolean
  onLog: (values: { weight: number; reps: number; isWarmup: boolean }) => Promise<void>
}) {
  const working = exercise.sets.filter((s) => !s.isWarmup)
  const prefill = prefillSet({ previous, current: working, targetWeight: exercise.plan?.targetWeight, targetReps: exercise.plan?.targetReps })
  const [wText, setWText] = useState(weightInputText(prefill.weight))
  const [rText, setRText] = useState(String(prefill.reps))
  const [warmup, setWarmup] = useState(false)
  const [saving, setSaving] = useState(false)
  // Guards against a double tap logging the same set twice before the button re-renders as disabled.
  const inFlight = useRef(false)

  const weight = parseWeight(wText)
  const reps = parseReps(rText)
  const n = working.length + 1
  const label = warmup ? 'Warm-up set' : exercise.plan ? `Set ${n} of ${exercise.plan.targetSets}${n > exercise.plan.targetSets ? ' (extra)' : ''}` : `Set ${n}`

  const submit = async () => {
    if (weight === null || reps === null || inFlight.current) return
    inFlight.current = true
    // Blur first so the iOS keyboard closes and the button press isn't lost.
    ;(document.activeElement as HTMLElement | null)?.blur()
    setSaving(true)
    try {
      await onLog({ weight, reps, isWarmup: warmup })
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <div className="sticky bottom-0 z-10 -mx-4 rounded-t-2xl border-t border-separator bg-surface/95 px-4 pt-3 pb-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{exercise.name}</p>
          <p className="text-[13px] text-label-2">{label}</p>
        </div>
        <WarmupToggle on={warmup} onToggle={() => setWarmup(!warmup)} />
      </div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <WeightInput text={wText} onText={setWText} bodyweight={bodyweight} />
        <RepsInput text={rText} onText={setRText} />
      </div>
      <button
        type="button"
        disabled={weight === null || reps === null || saving}
        onClick={() => void submit()}
        className="flex min-h-14 w-full items-center justify-center rounded-xl bg-accent text-[19px] font-semibold text-white active:opacity-70 disabled:opacity-40"
      >
        Log set
      </button>
    </div>
  )
}
