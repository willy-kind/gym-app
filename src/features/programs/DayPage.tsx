import { useState } from 'react'
import { useParams } from 'react-router'
import { NavButton, Page, Placeholder } from '../../components/Page'
import { ButtonRow, EditRow, ListGroup } from '../../components/List'
import { BottomAction } from '../../components/Button'
import { ConfirmSheet } from '../../components/Dialogs'
import { attempt } from '../../components/attempt'
import { addDayExercise, getDayDetail, removeDayExercise, reorderDayExercises } from '../../db/programs'
import { useLiveQuery } from '../../db/useLiveQuery'
import { moveItem } from '../../lib/order'
import { formatTargetSummary } from '../../lib/format'
import { TargetSheet } from './TargetSheet'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import { useSettings } from '../settings/settingsStore'

type Dialog = { kind: 'pick' } | { kind: 'target'; itemId: number } | { kind: 'remove'; itemId: number; name: string }

export function DayPage() {
  const params = useParams()
  const programId = Number(params.programId)
  const dayId = Number(params.dayId)
  const detail = useLiveQuery(() => getDayDetail(dayId), [dayId])
  const { unit, defaultRestSeconds } = useSettings()
  const [editing, setEditing] = useState(false)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const close = () => setDialog(null)

  if (detail === undefined) return <Page title="" back={{ to: `/programs/${programId}`, label: 'Back' }} />
  if (detail === null) {
    return (
      <Page title="Not found" back={{ to: `/programs/${programId}`, label: 'Back' }}>
        <Placeholder>This day no longer exists.</Placeholder>
      </Page>
    )
  }

  const { program, day, items } = detail
  const nameOf = (i: (typeof items)[number]) => i.exercise?.name ?? 'Unknown exercise'
  const move = (index: number, delta: number) =>
    attempt(() => reorderDayExercises(dayId, moveItem(items, index, delta).map((i) => i.item.id)))
  const openTarget = dialog?.kind === 'target' ? items.find((i) => i.item.id === dialog.itemId) : undefined

  return (
    <Page
      title={day.name}
      back={{ to: `/programs/${program.id}`, label: program.name }}
      action={items.length > 0 && <NavButton bold={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</NavButton>}
    >
      {items.length === 0 ? (
        <p className="mb-6 px-1 text-label-2">No exercises yet. Add one below.</p>
      ) : (
        <ListGroup footer={editing ? undefined : 'Tap an exercise to change its sets, reps, weight and rest.'}>
          {items.map((entry, i) =>
            editing ? (
              <EditRow
                key={entry.item.id}
                title={nameOf(entry)}
                subtitle={formatTargetSummary(entry.item, unit)}
                onDelete={() => setDialog({ kind: 'remove', itemId: entry.item.id, name: nameOf(entry) })}
                onUp={i > 0 ? () => void move(i, -1) : undefined}
                onDown={i < items.length - 1 ? () => void move(i, 1) : undefined}
              />
            ) : (
              <ButtonRow
                key={entry.item.id}
                title={nameOf(entry)}
                subtitle={formatTargetSummary(entry.item, unit)}
                onClick={() => setDialog({ kind: 'target', itemId: entry.item.id })}
              />
            ),
          )}
        </ListGroup>
      )}

      <BottomAction onClick={() => setDialog({ kind: 'pick' })}>Add exercise</BottomAction>

      {dialog?.kind === 'pick' && (
        <ExercisePickerSheet
          excludeIds={items.map((i) => i.item.exerciseId)}
          onClose={close}
          onPick={async (exerciseId) => {
            const itemId = await addDayExercise(dayId, exerciseId, defaultRestSeconds)
            // Straight into its targets so a new exercise is set up in one go.
            setDialog({ kind: 'target', itemId })
          }}
        />
      )}
      {dialog?.kind === 'target' && openTarget && (
        <TargetSheet
          name={nameOf(openTarget)}
          item={openTarget.item}
          onClose={close}
          onRemove={() => setDialog({ kind: 'remove', itemId: openTarget.item.id, name: nameOf(openTarget) })}
        />
      )}
      {dialog?.kind === 'remove' && (
        <ConfirmSheet
          title="Remove exercise?"
          message={`Remove “${dialog.name}” from ${day.name}? It stays in your exercise library and logged sets are kept.`}
          confirmLabel="Remove"
          onClose={close}
          onConfirm={() => attempt(() => removeDayExercise(dialog.itemId))}
        />
      )}
    </Page>
  )
}
