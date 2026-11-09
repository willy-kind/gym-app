import { useRef, useState } from 'react'
import { parseReps, parseWeight, weightInputText } from '../../lib/targets'
import { fromDisplay, toDisplay } from '../../lib/units'
import { useSettings } from '../settings/settingsStore'
import { unlockAudio } from './sound'
import { prefillSet, type SessionExercise, type SetValues } from '../../lib/session'
import { RepsInput, WarmupToggle, WeightInput } from './setFields'
import { PanelRestTimer } from './RestTimerBar'
import { useRestTimer } from './restTimerStore'

/**
 * The set entry panel, pinned to the bottom of the screen for the active exercise,
 * with the workout's rest timer across its top while a rest is running.
 * Remounted (keyed by exercise and set count) after every logged set, so it prefills the next one.
 */
export function SetConsole({
  sessionId,
  exercise,
  previous,
  bodyweight,
  suggestedWeight,
  onLog,
}: {
  sessionId: number
  exercise: SessionExercise
  previous: readonly SetValues[]
  bodyweight: boolean
  suggestedWeight?: number
  onLog: (values: { weight: number; reps: number; isWarmup: boolean }) => Promise<void>
}) {
  const working = exercise.sets.filter((s) => !s.isWarmup)
  const prefill = prefillSet({ previous, current: working, targetWeight: exercise.plan?.targetWeight, targetReps: exercise.plan?.targetReps, suggestedWeight })
  const { unit, timerSound } = useSettings()
  const timer = useRestTimer()
  const resting = timer !== null && timer.sessionId === sessionId
  const [wText, setWText] = useState(weightInputText(toDisplay(prefill.weight, unit)))
  const [rText, setRText] = useState(String(prefill.reps))
  const [warmup, setWarmup] = useState(false)
  const [saving, setSaving] = useState(false)
  // Guards against a double tap logging the same set twice before the button re-renders as disabled.
  const inFlight = useRef(false)

  const typed = parseWeight(wText)
  const weight = typed === null ? null : fromDisplay(typed, unit)
  const reps = parseReps(rText)
  const n = working.length + 1
  const label = warmup ? 'Warm-up set' : exercise.plan ? `Set ${n} of ${exercise.plan.targetSets}${n > exercise.plan.targetSets ? ' (extra)' : ''}` : `Set ${n}`

  const submit = async () => {
    if (weight === null || reps === null || inFlight.current) return
    inFlight.current = true
    // iOS only lets a page play sound after a tap; this tap unlocks the rest-over beep.
    if (timerSound) unlockAudio()
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
    <div className="sticky bottom-0 z-10 -mx-4 rounded-t-2xl bg-surface px-4 pt-4 pb-3 shadow-[0_-6px_24px_rgba(0,0,0,0.18)]">
      {/* While resting, the timer row names what's next and stands in for the title row. */}
      <PanelRestTimer sessionId={sessionId} next={timer?.exerciseName === exercise.name ? label : `${exercise.name} · ${label}`} />
      {!resting && (
        <div className="mb-2.5 min-w-0">
          <p className="truncate text-[15px] font-semibold">{exercise.name}</p>
          <p className="text-[13px] text-label-2">{label}</p>
        </div>
      )}
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <WeightInput text={wText} onText={setWText} bodyweight={bodyweight} unit={unit} />
        <RepsInput text={rText} onText={setRText} />
      </div>
      <div className="flex gap-2.5">
        <WarmupToggle on={warmup} onToggle={() => setWarmup(!warmup)} className="min-h-14" />
        <button
          type="button"
          disabled={weight === null || reps === null || saving}
          onClick={() => void submit()}
          className="flex min-h-14 flex-1 items-center justify-center rounded-full bg-accent text-[19px] font-semibold text-on-accent active:opacity-70 disabled:opacity-40"
        >
          Log set
        </button>
      </div>
    </div>
  )
}
