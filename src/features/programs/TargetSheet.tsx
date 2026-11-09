import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/Button'
import { StepButton, Stepper } from '../../components/Stepper'
import { attempt } from '../../components/attempt'
import { updateDayExercise } from '../../db/programs'
import type { ProgramDayExercise } from '../../db/types'
import { formatRepTarget, formatRest, MAX_REPS, MAX_REST_SECONDS, MAX_SETS, parseRepTarget, parseWeight, weightInputText } from '../../lib/targets'
import { fromDisplay, toDisplay, weightStep } from '../../lib/units'
import { useUnit } from '../settings/settingsStore'

export function TargetSheet({
  name,
  item,
  onClose,
  onRemove,
}: {
  name: string
  item: ProgramDayExercise & { id: number }
  onClose: () => void
  onRemove: () => void
}) {
  const reps = parseRepTarget(item.targetReps) ?? { min: 8, max: 10 }
  const [sets, setSets] = useState(item.targetSets)
  const [repMin, setRepMin] = useState(reps.min)
  const [repMax, setRepMax] = useState(reps.max)
  const unit = useUnit()
  const step = weightStep(unit)
  const [weightText, setWeightText] = useState(weightInputText(toDisplay(item.targetWeight ?? 0, unit)))
  const [rest, setRest] = useState(item.restSeconds)

  // Typed and stepped in the display unit; stored in kg.
  const typed = parseWeight(weightText)
  const weight = typed === null ? null : fromDisplay(typed, unit)
  const nudgeWeight = (delta: number) => setWeightText(weightInputText(Math.max(0, Math.round(((typed ?? 0) + delta) * 100) / 100)))

  const save = async () => {
    if (weight === null) return
    await attempt(() =>
      updateDayExercise(item.id, {
        targetSets: sets,
        targetReps: formatRepTarget({ min: repMin, max: repMax }),
        targetWeight: weight,
        restSeconds: rest,
      }),
    )
    onClose()
  }

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="divide-y divide-separator">
        <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={MAX_SETS} />
        <Stepper
          label="Reps from"
          value={repMin}
          min={1}
          max={MAX_REPS}
          onChange={(v) => {
            setRepMin(v)
            if (v > repMax) setRepMax(v)
          }}
        />
        <Stepper
          label="Reps to"
          value={repMax}
          min={1}
          max={MAX_REPS}
          onChange={(v) => {
            setRepMax(v)
            if (v < repMin) setRepMin(v)
          }}
        />
        <div className="flex items-center justify-between gap-3 py-1.5">
          <label htmlFor="target-weight" className="text-[17px]">
            Weight
          </label>
          <div className="flex items-center gap-1">
            <StepButton label="Decrease weight" disabled={!weight} onClick={() => nudgeWeight(-step)}>
              −
            </StepButton>
            <div className="relative">
              <input
                id="target-weight"
                inputMode="decimal"
                enterKeyHint="done"
                placeholder="BW"
                value={weightText}
                onChange={(e) => setWeightText(e.target.value)}
                className={`h-12 w-20 rounded-lg bg-surface-2 pr-7 text-right text-[20px] font-semibold tabular-nums outline-none ${weight === null ? 'text-danger' : ''}`}
              />
              <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[13px] text-label-2">{unit}</span>
            </div>
            <StepButton label="Increase weight" onClick={() => nudgeWeight(step)}>
              +
            </StepButton>
          </div>
        </div>
        <Stepper label="Rest" value={rest} onChange={setRest} step={15} min={0} max={MAX_REST_SECONDS} format={formatRest} />
      </div>
      <p className="mt-1 mb-4 px-1 text-[13px] text-label-2">
        Target: {formatRepTarget({ min: repMin, max: repMax })} reps. Leave weight empty for bodyweight.
      </p>
      <Button onClick={() => void save()} disabled={weight === null} className="mb-2">
        Save
      </Button>
      <Button variant="danger" onClick={onRemove} className="mb-2">
        Remove from day
      </Button>
    </Sheet>
  )
}
