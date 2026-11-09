import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/Button'
import { attempt } from '../../components/attempt'
import { updateSessionNotes, updateSessionTimes } from '../../db/history'
import { fromDateTimeLocal, toDateTimeLocal, validateSessionTimes } from '../../lib/history'

const fieldClass = 'min-h-12 w-full rounded-xl bg-surface-2 px-4 text-[17px] outline-none'

/** Fix a workout's start and finish, e.g. when Finish was tapped hours late. */
export function TimesSheet({ session, onClose }: { session: { id: number; startedAt: number; finishedAt: number }; onClose: () => void }) {
  const [start, setStart] = useState(toDateTimeLocal(session.startedAt))
  const [finish, setFinish] = useState(toDateTimeLocal(session.finishedAt))
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const s = fromDateTimeLocal(start)
    const f = fromDateTimeLocal(finish)
    const problem = validateSessionTimes(s, f, Date.now())
    if (problem) return setError(problem)
    void attempt(async () => {
      await updateSessionTimes(session.id, s!, f!)
      onClose()
    })
  }

  return (
    <Sheet title="Workout times" onClose={onClose}>
      <label className="mb-1 block px-1 text-[13px] text-label-2 uppercase" htmlFor="times-start">
        Started
      </label>
      <input id="times-start" type="datetime-local" value={start} onChange={(e) => (setStart(e.target.value), setError(null))} className={`${fieldClass} mb-4`} />
      <label className="mb-1 block px-1 text-[13px] text-label-2 uppercase" htmlFor="times-finish">
        Finished
      </label>
      <input id="times-finish" type="datetime-local" value={finish} onChange={(e) => (setFinish(e.target.value), setError(null))} className={fieldClass} />
      <p className="mt-1 mb-3 min-h-5 px-1 text-[13px] text-danger">{error}</p>
      <p className="mb-4 px-1 text-[13px] text-label-2">Moving the start moves all of this workout’s sets with it.</p>
      <Button className="mb-2" onClick={save}>
        Save
      </Button>
    </Sheet>
  )
}

export function NotesSheet({ sessionId, initial, onClose }: { sessionId: number; initial: string; onClose: () => void }) {
  const [notes, setNotes] = useState(initial)
  return (
    <Sheet title="Notes" onClose={onClose}>
      <textarea
        value={notes}
        maxLength={1000}
        rows={4}
        placeholder="How did it go?"
        onChange={(e) => setNotes(e.target.value)}
        className={`${fieldClass} mb-4 py-3`}
      />
      <Button
        className="mb-2"
        onClick={() =>
          void attempt(async () => {
            await updateSessionNotes(sessionId, notes)
            onClose()
          })
        }
      >
        Save
      </Button>
    </Sheet>
  )
}
