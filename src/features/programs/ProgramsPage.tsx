import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Page } from '../../components/Page'
import { LinkRow, ListGroup } from '../../components/List'
import { BottomAction } from '../../components/Button'
import { NameSheet } from '../../components/Dialogs'
import { createProgram, listPrograms } from '../../db/programs'
import { useLiveQuery } from '../../db/useLiveQuery'

export function ProgramsPage() {
  const programs = useLiveQuery(listPrograms, [])
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  const active = programs?.filter((p) => !p.program.archived) ?? []
  const archived = programs?.filter((p) => p.program.archived) ?? []

  return (
    <Page title="Programs">
      {programs && active.length === 0 && <p className="mb-6 px-1 text-label-2">No programs yet. Create one below.</p>}
      {active.length > 0 && (
        <ListGroup>
          {active.map(({ program, dayNames }) => (
            <LinkRow key={program.id} to={`/programs/${program.id}`} title={program.name} subtitle={dayNames.join(' · ') || 'No days'} />
          ))}
        </ListGroup>
      )}
      <ListGroup>
        <LinkRow to="/programs/exercises" title="Exercise library" />
      </ListGroup>
      {archived.length > 0 && (
        <ListGroup header="Archived">
          {archived.map(({ program, dayNames }) => (
            <LinkRow key={program.id} to={`/programs/${program.id}`} title={program.name} subtitle={dayNames.join(' · ') || 'No days'} />
          ))}
        </ListGroup>
      )}
      <BottomAction onClick={() => setCreating(true)}>New program</BottomAction>
      {creating && (
        <NameSheet
          title="New program"
          placeholder="e.g. Push Pull Legs"
          saveLabel="Create"
          onClose={() => setCreating(false)}
          onSave={async (name) => {
            const id = await createProgram(name)
            void navigate(`/programs/${id}`)
          }}
        />
      )}
    </Page>
  )
}
