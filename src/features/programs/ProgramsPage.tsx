import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Page } from '../../components/Page'
import { ButtonRow, LinkRow, ListGroup } from '../../components/List'
import { BottomAction } from '../../components/Button'
import { NameSheet } from '../../components/Dialogs'
import { createProgram, listPrograms } from '../../db/programs'
import { listExercises } from '../../db/exercises'
import { importProgram } from '../../db/programTransfer'
import { parseProgramFile } from '../../lib/programFile'
import { countOf } from '../../lib/format'
import { useLiveQuery } from '../../db/useLiveQuery'

export function ProgramsPage() {
  const programs = useLiveQuery(listPrograms, [])
  const exercises = useLiveQuery(listExercises, [])
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const importFile = async (file: File | undefined) => {
    if (!file) return
    setImportError(null)
    let text: string
    try {
      text = await file.text()
    } catch {
      return setImportError('Couldn’t read that file.')
    }
    const parsed = parseProgramFile(text)
    if (!parsed.ok) return setImportError(parsed.error)
    try {
      const { programId } = await importProgram(parsed.file.program)
      void navigate(`/programs/${programId}`)
    } catch (e) {
      setImportError(`Import failed; nothing was changed. ${e instanceof Error ? e.message : String(e)}`)
    }
  }

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
        <LinkRow to="/programs/exercises" title="Exercise library" subtitle={exercises ? countOf(exercises.length, 'exercise') : undefined} />
        <ButtonRow title="Import program…" subtitle="From a file exported with this app" onClick={() => fileInput.current?.click()} />
      </ListGroup>
      {importError && <p className="-mt-4 mb-6 px-1 text-[15px] text-danger">{importError}</p>}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void importFile(e.target.files?.[0])
          e.target.value = '' // allow picking the same file again
        }}
      />
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
