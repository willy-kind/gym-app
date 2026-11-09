import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/Button'
import { attempt } from '../../components/attempt'
import { deleteSet, updateSet } from '../../db/sessions'
import { parseReps, parseWeight, weightInputText } from '../../lib/targets'
import type { LoggedSet } from '../../lib/session'
import { RepsInput, WarmupToggle, WeightInput } from './setFields'

/** Edit or delete a logged set. Changes are saved straight away on Save. */
export function SetSheet({ set, bodyweight, onClose }: { set: LoggedSet; bodyweight: boolean; onClose: () => void }) {
  const [wText, setWText] = useState(weightInputText(set.weight))
  const [rText, setRText] = useState(String(set.reps))
  const [warmup, setWarmup] = useState(set.isWarmup)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const weight = parseWeight(wText)
  const reps = parseReps(rText)

  return (
    <Sheet title="Edit set" onClose={onClose}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <WeightInput text={wText} onText={setWText} bodyweight={bodyweight} />
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
            await updateSet(set.id, { weight: weight!, reps: reps!, isWarmup: warmup })
            onClose()
          })
        }
      >
        Save
      </Button>
      <Button
        variant="danger"
        className="mb-2"
        onClick={() => {
          if (!confirmDelete) return setConfirmDelete(true)
          void attempt(async () => {
            await deleteSet(set.id)
            onClose()
          })
        }}
      >
        {confirmDelete ? 'Tap again to delete' : 'Delete set'}
      </Button>
    </Sheet>
  )
}
