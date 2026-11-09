import { useEffect, useRef, useState } from 'react'
import { ListGroup } from '../../components/List'
import { Button } from '../../components/Button'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { importStrong, planStrongImport, type StrongImportPlan } from '../../db/strongImport'
import { formatDay } from '../../lib/date'
import { countOf } from '../../lib/format'
import { parseStrongCsv, StrongFormatError } from '../../lib/strongImport'
import type { WeightUnit } from '../../lib/units'
import { useUnit } from '../settings/settingsStore'

interface Preview {
  plan: StrongImportPlan
  skipped: number
}

/** Settings card: pick a Strong CSV export, preview what it adds, then import it. */
export function StrongImportSection() {
  const appUnit = useUnit()
  const fileInput = useRef<HTMLInputElement>(null)
  const [text, setText] = useState<string | null>(null)
  const [unit, setUnit] = useState<WeightUnit>(appUnit)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  // Re-read the file whenever it or the chosen unit changes.
  useEffect(() => {
    if (text === null) return
    let cancelled = false
    void (async () => {
      try {
        const { workouts, skipped } = parseStrongCsv(text, unit)
        const plan = await planStrongImport(workouts)
        if (!cancelled) setPreview({ plan, skipped })
      } catch (e) {
        if (cancelled) return
        setText(null)
        setPreview(null)
        setMessage({ text: e instanceof StrongFormatError ? e.message : 'Couldn’t read this file.', error: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [text, unit])

  const pick = async (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    try {
      setUnit(appUnit)
      setText(await file.text())
    } catch {
      setMessage({ text: 'Couldn’t read this file.', error: true })
    }
  }

  const close = () => {
    setText(null)
    setPreview(null)
  }

  const run = async () => {
    if (!preview || text === null) return
    setBusy(true)
    try {
      const done = await importStrong(parseStrongCsv(text, unit).workouts)
      setMessage({ text: `Imported ${countOf(done.workouts.length, 'workout')} (${countOf(done.sets, 'set')}).` })
      close()
    } catch {
      setMessage({ text: 'Import failed. Nothing was changed.', error: true })
    } finally {
      setBusy(false)
    }
  }

  const p = preview?.plan
  const first = p?.workouts[0]?.startedAt
  const last = p?.workouts.at(-1)?.startedAt

  return (
    <>
      <ListGroup header="Import">
        <li className="px-4 pt-3 pb-4">
          <p className="text-[17px]">Import from Strong</p>
          <p className="mb-3 text-[13px] text-label-2">
            In Strong: Settings → Export data, save the CSV to Files, then pick it here. You’ll see what will be added before anything changes.
          </p>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Choose Strong CSV…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv,text/comma-separated-values"
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0])
              e.target.value = '' // allow picking the same file again
            }}
          />
          {message && <p className={`mt-2 text-[15px] ${message.error ? 'text-danger' : 'text-label-2'}`}>{message.text}</p>}
        </li>
      </ListGroup>

      {preview && p && (
        <Sheet title="Import from Strong" onClose={close}>
          <p className="mb-1 px-1 text-[17px] font-semibold">
            {p.workouts.length === 0 ? 'Nothing new to import' : `${countOf(p.workouts.length, 'workout')} · ${countOf(p.sets, 'set')}`}
          </p>
          {first !== undefined && last !== undefined && (
            <p className="mb-2 px-1 text-[15px] text-label-2">
              {formatDay(first)} – {formatDay(last)}
            </p>
          )}
          <ul className="mb-3 list-disc pl-6 text-[15px] text-label-2">
            {p.newExercises.length > 0 && (
              <li>
                {countOf(p.newExercises.length, 'new exercise')}: {p.newExercises.slice(0, 6).join(', ')}
                {p.newExercises.length > 6 ? ', …' : ''}
              </li>
            )}
            {p.duplicates > 0 && <li>{countOf(p.duplicates, 'workout')} already in the app (skipped)</li>}
            {preview.skipped > 0 && <li>{countOf(preview.skipped, 'row')} without reps skipped (e.g. cardio)</li>}
            <li>Each workout gets the note “Strong: name”.</li>
          </ul>
          <p className="mb-1.5 px-1 text-[13px] text-label-2">Weights in the file are in</p>
          <div className="mb-4">
            <Segmented
              label="Weight unit in the file"
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
              value={unit}
              onChange={setUnit}
            />
          </div>
          <p className="mb-3 px-1 text-[13px] text-label-2">Tip: export a backup first, so you can undo the import by restoring it.</p>
          <Button className="mb-2" disabled={busy || p.workouts.length === 0} onClick={() => void run()}>
            {p.workouts.length === 0 ? 'Nothing to import' : `Import ${countOf(p.workouts.length, 'workout')}`}
          </Button>
        </Sheet>
      )}
    </>
  )
}
