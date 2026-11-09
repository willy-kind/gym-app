import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NavButton, Page, Placeholder } from '../../components/Page'
import { ButtonRow, EditRow, LinkRow, ListGroup } from '../../components/List'
import { BottomAction } from '../../components/Button'
import { ConfirmSheet, NameSheet } from '../../components/Dialogs'
import { attempt } from '../../components/attempt'
import { addDay, deleteDay, deleteProgram, getProgramDetail, renameDay, reorderDays, updateProgram } from '../../db/programs'
import { useLiveQuery } from '../../db/useLiveQuery'
import { moveItem } from '../../lib/order'

type Dialog =
  | { kind: 'renameProgram' }
  | { kind: 'deleteProgram' }
  | { kind: 'addDay' }
  | { kind: 'renameDay'; dayId: number; name: string }
  | { kind: 'deleteDay'; dayId: number; name: string; exerciseCount: number }

export function ProgramPage() {
  const programId = Number(useParams().programId)
  const detail = useLiveQuery(() => getProgramDetail(programId), [programId])
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const close = () => setDialog(null)

  const back = { to: '/programs', label: 'Programs' }
  if (detail === undefined) return <Page title="" back={back} />
  if (detail === null) {
    return (
      <Page title="Not found" back={back}>
        <Placeholder>This program no longer exists.</Placeholder>
      </Page>
    )
  }

  const { program, days } = detail
  const move = (index: number, delta: number) =>
    attempt(() => reorderDays(programId, moveItem(days, index, delta).map((d) => d.day.id)))

  return (
    <Page
      title={program.name}
      back={back}
      action={days.length > 0 && <NavButton bold={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</NavButton>}
    >
      {program.archived && <p className="mb-4 px-1 text-label-2">Archived. It won’t be offered when starting a session.</p>}

      {days.length === 0 ? (
        <p className="mb-6 px-1 text-label-2">No days yet. Add one below, e.g. “Push A”.</p>
      ) : (
        <ListGroup header="Days">
          {days.map(({ day, exerciseCount }, i) =>
            editing ? (
              <EditRow
                key={day.id}
                title={day.name}
                subtitle="Tap to rename"
                onTap={() => setDialog({ kind: 'renameDay', dayId: day.id, name: day.name })}
                onDelete={() => setDialog({ kind: 'deleteDay', dayId: day.id, name: day.name, exerciseCount })}
                onUp={i > 0 ? () => void move(i, -1) : undefined}
                onDown={i < days.length - 1 ? () => void move(i, 1) : undefined}
              />
            ) : (
              <LinkRow
                key={day.id}
                to={`/programs/${programId}/days/${day.id}`}
                title={day.name}
                subtitle={`${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}`}
              />
            ),
          )}
        </ListGroup>
      )}

      <ListGroup>
        <ButtonRow title="Rename program" onClick={() => setDialog({ kind: 'renameProgram' })} />
        <ButtonRow
          title={program.archived ? 'Unarchive program' : 'Archive program'}
          onClick={() => void attempt(() => updateProgram(programId, { archived: !program.archived }))}
        />
        <ButtonRow danger title="Delete program" onClick={() => setDialog({ kind: 'deleteProgram' })} />
      </ListGroup>

      <BottomAction onClick={() => setDialog({ kind: 'addDay' })}>Add day</BottomAction>

      {dialog?.kind === 'renameProgram' && (
        <NameSheet title="Rename program" initial={program.name} onClose={close} onSave={(name) => updateProgram(programId, { name })} />
      )}
      {dialog?.kind === 'deleteProgram' && (
        <ConfirmSheet
          title="Delete program?"
          message={`“${program.name}” and its ${days.length} ${days.length === 1 ? 'day' : 'days'} will be deleted. Logged sessions are kept. To just hide it, archive it instead.`}
          confirmLabel="Delete program"
          onClose={close}
          onConfirm={async () => {
            await attempt(() => deleteProgram(programId))
            void navigate('/programs', { replace: true })
          }}
        />
      )}
      {dialog?.kind === 'addDay' && (
        <NameSheet
          title="New day"
          placeholder="e.g. Push A"
          saveLabel="Add"
          onClose={close}
          onSave={async (name) => {
            const dayId = await addDay(programId, name)
            void navigate(`/programs/${programId}/days/${dayId}`)
          }}
        />
      )}
      {dialog?.kind === 'renameDay' && (
        <NameSheet title="Rename day" initial={dialog.name} onClose={close} onSave={(name) => renameDay(dialog.dayId, name)} />
      )}
      {dialog?.kind === 'deleteDay' && (
        <ConfirmSheet
          title="Delete day?"
          message={`“${dialog.name}” and its ${dialog.exerciseCount} ${dialog.exerciseCount === 1 ? 'exercise' : 'exercises'} will be removed from this program. Logged sessions are kept.`}
          confirmLabel="Delete day"
          onClose={close}
          onConfirm={() => attempt(() => deleteDay(dialog.dayId))}
        />
      )}
    </Page>
  )
}
