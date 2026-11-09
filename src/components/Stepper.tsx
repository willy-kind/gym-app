import type { ReactNode } from 'react'

export interface StepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  /** How to show the value; defaults to the number. */
  format?: (value: number) => ReactNode
}

/** Big −/+ stepper for sweaty thumbs. */
export function Stepper({ label, value, onChange, step = 1, min = -Infinity, max = Infinity, format }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)))
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[17px]">{label}</span>
      <div className="flex items-center gap-1">
        <StepButton label={`Decrease ${label}`} disabled={value <= min} onClick={() => set(value - step)}>
          −
        </StepButton>
        <span className="min-w-16 text-center text-[20px] font-semibold tabular-nums">{format ? format(value) : value}</span>
        <StepButton label={`Increase ${label}`} disabled={value >= max} onClick={() => set(value + step)}>
          +
        </StepButton>
      </div>
    </div>
  )
}

export function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-[26px] leading-none text-accent active:opacity-60 disabled:opacity-30"
    >
      {children}
    </button>
  )
}
