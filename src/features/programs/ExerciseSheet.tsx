import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/Button'
import { attempt } from '../../components/attempt'
import { deleteExerciseIfUnused, getExercise, getExerciseUsage, updateExercise } from '../../db/exercises'
import type { Exercise } from '../../db/types'
import { useLiveQuery } from '../../db/useLiveQuery'
import { cleanName, MAX_NAME_LENGTH } from '../../lib/targets'

const fieldClass = 'min-h-12 w-full rounded-xl bg-surface-2 px-4 text-[17px] outline-none'

/** Edit an exercise's name, muscle group and notes. Renaming applies everywhere, including history. */
export function ExerciseSheet({ exerciseId, onClose }: { exerciseId: number; onClose: () => void }) {
  const data = useLiveQuery(async () => ({ exercise: await getExercise(exerciseId), usage: await getExerciseUsage(exerciseId) }), [exerciseId])
  const missing = data !== undefined && !data.exercise
  useEffect(() => {
    if (missing) onClose()
  }, [missing, onClose])

  if (!data?.exercise) return null
  return <ExerciseForm exercise={data.exercise} usage={data.usage} onClose={onClose} />
}

function ExerciseForm({
  exercise,
  usage,
  onClose,
}: {
  exercise: Exercise & { id: number }
  usage: { dayCount: number; setCount: number }
  onClose: () => void
}) {
  const [name, setName] = useState(exercise.name)
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscleGroup ?? '')
  const [notes, setNotes] = useState(exercise.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const cleaned = cleanName(name)
  const inUse = usage.dayCount > 0 || usage.setCount > 0

  const save = async () => {
    if (!cleaned) return
    try {
      await updateExercise(exercise.id, {
        name: cleaned,
        muscleGroup: muscleGroup.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Sheet title="Edit exercise" onClose={onClose}>
      <label className="mb-1 block px-1 text-[13px] text-label-2 uppercase">Name</label>
      <input
        value={name}
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        className={fieldClass}
      />
      <p className="mb-2 min-h-5 px-1 text-[13px] text-danger">{error}</p>
      <label className="mb-1 block px-1 text-[13px] text-label-2 uppercase">Muscle group</label>
      <input value={muscleGroup} maxLength={40} placeholder="Optional, e.g. Chest" autoCapitalize="words" onChange={(e) => setMuscleGroup(e.target.value)} className={`${fieldClass} mb-4`} />
      <label className="mb-1 block px-1 text-[13px] text-label-2 uppercase">Notes</label>
      <textarea
        value={notes}
        maxLength={500}
        rows={3}
        placeholder="Optional, e.g. seat height 4"
        onChange={(e) => setNotes(e.target.value)}
        className={`${fieldClass} mb-1 py-3`}
      />
      <p className="mb-4 px-1 text-[13px] text-label-2">
        Used on {usage.dayCount} program {usage.dayCount === 1 ? 'day' : 'days'} · {usage.setCount} logged {usage.setCount === 1 ? 'set' : 'sets'}.
        {usage.setCount > 0 && ' Renaming also renames it in your history.'}
      </p>
      <Button onClick={() => void save()} disabled={!cleaned} className="mb-2">
        Save
      </Button>
      {!inUse && (
        <Button
          variant="danger"
          className="mb-2"
          onClick={() =>
            void attempt(async () => {
              await deleteExerciseIfUnused(exercise.id)
              onClose()
            })
          }
        >
          Delete exercise
        </Button>
      )}
    </Sheet>
  )
}
