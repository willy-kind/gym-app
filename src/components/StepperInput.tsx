import { useId } from 'react'
import { StepButton } from './Stepper'

export interface StepperInputProps {
  label: string
  text: string
  onText: (text: string) => void
  parse: (text: string) => number | null
  format: (value: number) => string
  step: number
  min: number
  max: number
  inputMode: 'decimal' | 'numeric'
  placeholder?: string
  unit?: string
}

/** −/+ buttons around a typed number, for weight and reps. Invalid text is shown in red. */
export function StepperInput({ label, text, onText, parse, format, step, min, max, inputMode, placeholder, unit }: StepperInputProps) {
  const id = useId()
  const value = parse(text)
  const nudge = (delta: number) => {
    const next = Math.round(((value ?? min) + delta) * 100) / 100
    onText(format(Math.min(max, Math.max(min, next))))
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <label htmlFor={id} className="text-[13px] text-label-2">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <StepButton label={`Decrease ${label}`} disabled={value !== null && value <= min} onClick={() => nudge(-step)}>
          −
        </StepButton>
        <div className="relative">
          <input
            id={id}
            inputMode={inputMode}
            enterKeyHint="done"
            autoComplete="off"
            placeholder={placeholder}
            value={text}
            onChange={(e) => onText(e.target.value)}
            onFocus={(e) => e.target.select()}
            className={`h-12 w-[4.5rem] rounded-lg bg-surface-2 text-center text-[22px] font-semibold tabular-nums outline-none ${unit ? 'pr-5' : ''} ${value === null ? 'text-danger' : ''}`}
          />
          {unit && <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[11px] text-label-2">{unit}</span>}
        </div>
        <StepButton label={`Increase ${label}`} disabled={value !== null && value >= max} onClick={() => nudge(step)}>
          +
        </StepButton>
      </div>
    </div>
  )
}
