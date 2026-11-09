import { StepperInput } from '../../components/StepperInput'
import { MAX_REPS, parseReps, parseWeight, weightInputText } from '../../lib/targets'

export const WEIGHT_STEP = 2.5

export function WeightInput({ text, onText, bodyweight }: { text: string; onText: (t: string) => void; bodyweight: boolean }) {
  return (
    <StepperInput
      label={bodyweight ? 'Extra weight' : 'Weight'}
      text={text}
      onText={onText}
      parse={parseWeight}
      format={weightInputText}
      step={WEIGHT_STEP}
      min={0}
      max={1000}
      inputMode="decimal"
      placeholder="BW"
      unit="kg"
    />
  )
}

export function RepsInput({ text, onText }: { text: string; onText: (t: string) => void }) {
  return <StepperInput label="Reps" text={text} onText={onText} parse={parseReps} format={String} step={1} min={1} max={MAX_REPS} inputMode="numeric" />
}

export function WarmupToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`min-h-11 shrink-0 rounded-full px-4 text-[15px] font-medium ${on ? 'bg-accent text-white' : 'bg-surface-2 text-label-2'}`}
    >
      Warm-up
    </button>
  )
}
