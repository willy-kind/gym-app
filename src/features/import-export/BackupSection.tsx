import { useRef, useState } from 'react'
import { ListGroup } from '../../components/List'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { exportAll, restoreAll } from '../../db/backup'
import { getActiveSession } from '../../db/sessions'
import { backupCounts, backupFileName, createBackup, parseBackup, serializeBackup, type BackupFile } from '../../lib/backup'
import { formatClock, formatDay } from '../../lib/date'
import { clearRest } from '../session/restTimerStore'
import { updateSettings, useSettings } from '../settings/settingsStore'

type Prepared = { file: File; counts: ReturnType<typeof backupCounts> }
type Pending = { backup: BackupFile; activeHere: boolean }

/** Export everything to a JSON file via the share sheet, or restore one (with confirmation). */
export function BackupSection() {
  const { lastBackupAt } = useSettings()
  const fileInput = useRef<HTMLInputElement>(null)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const prepare = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const now = Date.now()
      const data = await exportAll()
      const json = serializeBackup(createBackup(data, now))
      setPrepared({ file: new File([json], backupFileName(now), { type: 'application/json' }), counts: backupCounts(data) })
    } catch (e) {
      setMessage({ text: `Couldn’t read the data: ${e instanceof Error ? e.message : String(e)}`, error: true })
    } finally {
      setBusy(false)
    }
  }

  // Called straight from the tap: iOS only opens the share sheet from a user gesture.
  const share = async (p: Prepared) => {
    try {
      if (navigator.canShare?.({ files: [p.file] })) {
        await navigator.share({ files: [p.file], title: p.file.name })
      } else {
        const url = URL.createObjectURL(p.file)
        const a = document.createElement('a')
        a.href = url
        a.download = p.file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      updateSettings({ lastBackupAt: Date.now() })
      setPrepared(null)
      setMessage({ text: `Backup saved: ${p.file.name}` })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // share sheet cancelled
      setMessage({ text: `Couldn’t save the backup: ${e instanceof Error ? e.message : String(e)}`, error: true })
    }
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    let text: string
    try {
      text = await file.text()
    } catch {
      return setMessage({ text: 'Couldn’t read that file.', error: true })
    }
    const result = parseBackup(text)
    if (!result.ok) return setMessage({ text: result.error, error: true })
    setPending({ backup: result.backup, activeHere: (await getActiveSession()) !== undefined })
  }

  const restore = async (backup: BackupFile) => {
    setBusy(true)
    try {
      await restoreAll(backup.data)
      clearRest()
      setPending(null)
      const c = backupCounts(backup.data)
      setMessage({ text: `Restored ${c.sessions} workouts and ${c.programs} programs.` })
    } catch (e) {
      setMessage({ text: `Restore failed; nothing was changed. ${e instanceof Error ? e.message : String(e)}`, error: true })
    } finally {
      setBusy(false)
    }
  }

  const exportedAt = pending ? Date.parse(pending.backup.exportedAt) : NaN

  return (
    <>
      <ListGroup
        header="Backup"
        footer="Your data only lives on this phone. Export a backup regularly and keep it in Files or iCloud Drive."
      >
        <li className="px-4 py-3">
          <p className="text-[15px] text-label-2">
            {lastBackupAt ? `Last backup: ${formatDay(lastBackupAt)}, ${formatClock(lastBackupAt)}` : 'No backup made from this phone yet.'}
          </p>
        </li>
      </ListGroup>

      <div className="mb-2 flex flex-col gap-3">
        {prepared ? (
          <Button onClick={() => void share(prepared)}>Save or share backup</Button>
        ) : (
          <Button onClick={() => void prepare()} disabled={busy}>
            Export backup
          </Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
          Restore from backup…
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0])
            e.target.value = '' // allow picking the same file again
          }}
        />
      </div>
      {prepared && (
        <p className="mb-2 px-1 text-[13px] text-label-2">
          Ready: {prepared.counts.sessions} workouts, {prepared.counts.sets} sets, {prepared.counts.programs} programs. Tap above, then “Save to Files”.
        </p>
      )}
      {message && <p className={`mb-4 px-1 text-[15px] ${message.error ? 'text-danger' : 'text-label-2'}`}>{message.text}</p>}

      {pending && (
        <Sheet title="Restore backup?" onClose={() => setPending(null)}>
          <p className="mb-2 px-1">
            Backup from {Number.isNaN(exportedAt) ? 'an unknown date' : `${formatDay(exportedAt)}, ${formatClock(exportedAt)}`}:
          </p>
          <p className="mb-3 px-1 text-label-2">
            {(() => {
              const c = backupCounts(pending.backup.data)
              return `${c.sessions} workouts · ${c.sets} sets · ${c.programs} programs · ${c.exercises} exercises`
            })()}
          </p>
          <p className="mb-4 px-1 font-semibold text-danger">
            Everything on this phone will be replaced by this backup{pending.activeHere ? ', including the workout in progress' : ''}. This can’t be undone.
          </p>
          <Button variant="danger" className="mb-2" disabled={busy} onClick={() => void restore(pending.backup)}>
            Replace all data
          </Button>
        </Sheet>
      )}
    </>
  )
}
