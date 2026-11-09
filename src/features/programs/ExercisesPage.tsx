import { useState } from 'react'
import { Page } from '../../components/Page'
import { ButtonRow, ListGroup } from '../../components/List'
import { BottomAction } from '../../components/Button'
import { NameSheet } from '../../components/Dialogs'
import { listExercises, DuplicateExerciseError, findOrCreateExercise } from '../../db/exercises'
import { useLiveQuery } from '../../db/useLiveQuery'
import { filterByName, findByName } from '../../lib/search'
import { ExerciseSheet } from './ExerciseSheet'

export function ExercisesPage() {
  const exercises = useLiveQuery(listExercises, [])
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const shown = filterByName(exercises ?? [], query)

  return (
    <Page title="Exercises" back={{ to: '/programs', label: 'Programs' }}>
      <input
        type="search"
        value={query}
        placeholder="Search"
        enterKeyHint="search"
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 min-h-11 w-full rounded-xl bg-surface-2 px-4 text-[17px] outline-none"
      />
      {exercises && shown.length === 0 && <p className="mb-6 px-1 text-label-2">{query ? 'No matches.' : 'No exercises yet.'}</p>}
      {shown.length > 0 && (
        <ListGroup>
          {shown.map((e) => (
            <ButtonRow key={e.id} title={e.name} subtitle={e.muscleGroup} onClick={() => setEditingId(e.id)} />
          ))}
        </ListGroup>
      )}
      <BottomAction onClick={() => setCreating(true)}>New exercise</BottomAction>

      {editingId !== null && <ExerciseSheet exerciseId={editingId} onClose={() => setEditingId(null)} />}
      {creating && (
        <NameSheet
          title="New exercise"
          placeholder="e.g. Hip Thrust (Barbell)"
          saveLabel="Create"
          onClose={() => setCreating(false)}
          onSave={async (name) => {
            if (findByName(exercises ?? [], name)) throw new DuplicateExerciseError(name)
            await findOrCreateExercise(name)
          }}
        />
      )}
    </Page>
  )
}
