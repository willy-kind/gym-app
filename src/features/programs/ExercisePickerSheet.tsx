import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { attempt } from '../../components/attempt'
import { findOrCreateExercise, listExercises } from '../../db/exercises'
import { useLiveQuery } from '../../db/useLiveQuery'
import { filterByName, findByName } from '../../lib/search'
import { cleanName, MAX_NAME_LENGTH } from '../../lib/targets'

/** Search the exercise library, or create a new exercise from the search text. */
export function ExercisePickerSheet({
  excludeIds,
  onPick,
  onClose,
}: {
  /** Exercises already on the day; shown but marked. */
  excludeIds: number[]
  onPick: (exerciseId: number) => Promise<void> | void
  onClose: () => void
}) {
  const exercises = useLiveQuery(listExercises, []) ?? []
  const [query, setQuery] = useState('')
  const matches = filterByName(exercises, query)
  const newName = cleanName(query)
  const canCreate = newName !== null && !findByName(exercises, newName)

  const pick = (id: number) => attempt(async () => onPick(id))

  return (
    <Sheet title="Add exercise" onClose={onClose}>
      <input
        type="search"
        value={query}
        maxLength={MAX_NAME_LENGTH}
        placeholder="Search or type a new name"
        enterKeyHint="search"
        autoCapitalize="words"
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 min-h-12 w-full rounded-xl bg-surface-2 px-4 text-[17px] outline-none"
      />
      <ul className="mb-2 divide-y divide-separator overflow-hidden rounded-xl bg-surface-2">
        {canCreate && (
          <li>
            <button
              type="button"
              className="flex min-h-12 w-full items-center px-4 py-2.5 text-left font-semibold text-accent"
              onClick={() => void attempt(async () => pick(await findOrCreateExercise(newName)))}
            >
              Create “{newName}”
            </button>
          </li>
        )}
        {matches.map((e) => (
          <li key={e.id}>
            <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left" onClick={() => void pick(e.id)}>
              <span>{e.name}</span>
              {excludeIds.includes(e.id) && <span className="shrink-0 text-[13px] text-label-2">Already on this day</span>}
            </button>
          </li>
        ))}
        {matches.length === 0 && !canCreate && <li className="px-4 py-3 text-label-2">No exercises yet. Type a name to create one.</li>}
      </ul>
    </Sheet>
  )
}
