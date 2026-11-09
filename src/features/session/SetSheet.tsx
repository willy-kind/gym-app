import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/Button'
import { attempt } from '../../components/attempt'
import { parseReps, parseWeight, weightInputText } from '../../lib/targets'
import { fromDisplay, toDisplay } from '../../lib/units'
import { useUnit } from '../settings/settingsStore'
import { RepsInput, WarmupToggle, WeightInput } from './setFields'

export interface SetValuesInput {
  weight: number
  reps: number
  isWarmup: boolean
}

/** Edit a logged set, or enter a new one. Saves only when Save is tapped. */
export function SetSheet({
  title,
  initial,
  bodyweight,
  onSave,
  onDelete,
  onClose,
}: {
  title: string
  initial: SetValuesInput
  bodyweight: boolean
  onSave: (values: SetValuesInput) => Promise<unknown>
  /** Omit for a new set. */
  onDelete?: () => Promise<unknown>
  onClose: () => void
}) {
  const unit = useUnit()
  const [wText, setWText] = useState(weightInputText(toDisplay(initial.weight, unit)))
  const [rText, setRText] = useState(String(initial.reps))
  const [warmup, setWarmup] = useState(initial.isWarmup)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const typed = parseWeight(wText)
  const weight = typed === null ? null : fromDisplay(typed, unit)
  const reps = parseReps(rText)

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <WeightInput text={wText} onText={setWText} bodyweight={bodyweight} unit={unit} />
        <RepsInput text={rText} onText={setRText} />
      </div>
      <div className="mb-4 flex justify-center">
        <WarmupToggle on={warmup} onToggle={() => setWarmup(!warmup)} />
      </div>
      <Button
        className="mb-2"
        disabled={weight === null || reps === null}
        onClick={() =>
          void attempt(async () => {
            await onSave({ weight: weight!, reps: reps!, isWarmup: warmup })
            onClose()
          })
        }
      >
        Save
      </Button>
      {onDelete && (
        <Button
          variant="danger"
          className="mb-2"
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true)
            void attempt(async () => {
              await onDelete()
              onClose()
            })
          }}
        >
          {confirmDelete ? 'Tap again to delete' : 'Delete set'}
        </Button>
      )}
    </Sheet>
  )
}
