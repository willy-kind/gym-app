import { StepperInput } from '../../components/StepperInput'
import { MAX_REPS, parseReps, parseWeight, weightInputText } from '../../lib/targets'
import { weightStep, type WeightUnit } from '../../lib/units'

/** Weight typed and stepped in the display unit; callers convert to kg. */
export function WeightInput({ text, onText, bodyweight, unit }: { text: string; onText: (t: string) => void; bodyweight: boolean; unit: WeightUnit }) {
  return (
    <StepperInput
      label={bodyweight ? 'Extra weight' : 'Weight'}
      text={text}
      onText={onText}
      parse={parseWeight}
      format={weightInputText}
      step={weightStep(unit)}
      min={0}
      max={unit === 'kg' ? 1000 : 2200}
      inputMode="decimal"
      placeholder="BW"
      unit={unit}
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
