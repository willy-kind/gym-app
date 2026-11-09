import { useState } from 'react'
import { Sheet } from './Sheet'
import { Button } from './Button'
import { cleanName, MAX_NAME_LENGTH } from '../lib/targets'

/** Sheet with a single name field. `onSave` may throw to show an error (e.g. duplicate name). */
export function NameSheet({
  title,
  initial = '',
  placeholder,
  saveLabel = 'Save',
  onSave,
  onClose,
}: {
  title: string
  initial?: string
  placeholder?: string
  saveLabel?: string
  onSave: (name: string) => Promise<void> | void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const name = cleanName(value)

  const submit = async () => {
    if (!name) return
    try {
      await onSave(name)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          // Autofocus inside a user-opened sheet is expected; it brings up the keyboard straight away.
          autoFocus
          value={value}
          maxLength={MAX_NAME_LENGTH}
          placeholder={placeholder}
          enterKeyHint="done"
          autoCapitalize="words"
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          className="mb-2 min-h-12 w-full rounded-xl bg-surface-2 px-4 text-[17px] outline-none"
        />
        <p className="mb-3 min-h-5 px-1 text-[13px] text-danger">{error}</p>
        <Button type="submit" disabled={!name} className="mb-2">
          {saveLabel}
        </Button>
      </form>
    </Sheet>
  )
}

/** Confirmation sheet for destructive actions. */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="mb-4 px-1 text-label-2">{message}</p>
      <Button
        variant="danger"
        className="mb-2"
        onClick={async () => {
          await onConfirm()
          onClose()
        }}
      >
        {confirmLabel}
      </Button>
    </Sheet>
  )
}
