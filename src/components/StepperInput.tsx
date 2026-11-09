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
  /** Replaces the plain value ± step, e.g. to snap to a grid. */
  stepFrom?: (value: number, direction: 1 | -1) => number
}

/**
 * A typed number with −/+ buttons, for weight and reps, in a recessed well:
 * label (and unit) on top, the big value between the buttons. Invalid text is red.
 */
export function StepperInput({ label, text, onText, parse, format, step, min, max, inputMode, placeholder, unit, stepFrom }: StepperInputProps) {
  const id = useId()
  const value = parse(text)
  const nudge = (direction: 1 | -1) => {
    const from = value ?? min
    const next = stepFrom ? stepFrom(from, direction) : Math.round((from + direction * step) * 100) / 100
    onText(format(Math.min(max, Math.max(min, next))))
  }
  return (
    <div className="min-w-0 rounded-lg bg-bg px-2.5 pt-2 pb-2.5">
      <label htmlFor={id} className="mb-1 block px-0.5 text-[12px] text-label-2">
        {label}
        {unit && ` · ${unit}`}
      </label>
      <div className="flex items-center justify-between gap-1">
        <StepButton label={`Decrease ${label}`} disabled={value !== null && value <= min} onClick={() => nudge(-1)}>
          −
        </StepButton>
        <input
          id={id}
          inputMode={inputMode}
          enterKeyHint="done"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => onText(e.target.value)}
          onFocus={(e) => e.target.select()}
          className={`h-11 w-full min-w-0 rounded-md bg-transparent text-center text-[28px] font-bold tabular-nums outline-none placeholder:text-label-2 focus:bg-surface-2 ${value === null ? 'text-danger' : ''}`}
        />
        <StepButton label={`Increase ${label}`} disabled={value !== null && value >= max} onClick={() => nudge(1)}>
          +
        </StepButton>
      </div>
    </div>
  )
}
