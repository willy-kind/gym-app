import { useState } from 'react'
import { Button } from '../../components/Button'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { getShareWorkout, getShareWorkouts, SHARE_RANGES, type ShareRange } from '../../db/share'
import { useLiveQuery } from '../../db/useLiveQuery'
import { formatDay } from '../../lib/date'
import { countOf } from '../../lib/format'
import { shareTextForWorkout, shareTextForWorkouts } from '../../lib/aiExport'
import { useSettings } from '../settings/settingsStore'

type Outcome = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * Opens the share sheet (Copy, an AI app, …) with the text, or copies it if
 * sharing isn't available. Must be called straight from a tap: iOS only opens the
 * share sheet from a user gesture, so the text has to be ready beforehand.
 */
async function shareText(text: string): Promise<Outcome> {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Not allowed here: fall back to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

const MESSAGES: Record<Outcome, string | null> = {
  shared: null,
  cancelled: null,
  copied: 'Copied. Paste it into a chat with your AI assistant.',
  failed: 'Couldn’t share or copy the text.',
}

function useShare() {
  const [message, setMessage] = useState<string | null>(null)
  const share = (text: string) => {
    setMessage(null)
    void shareText(text).then((o) => setMessage(MESSAGES[o]))
  }
  return { share, message }
}

/** "Share with AI" for one finished workout (workout detail screen). */
export function ShareWorkoutButton({ sessionId }: { sessionId: number }) {
  const { unit, aiQuestion } = useSettings()
  const text = useLiveQuery(async () => {
    const w = await getShareWorkout(sessionId)
    return w ? shareTextForWorkout(w, unit, aiQuestion) : null
  }, [sessionId, unit, aiQuestion])
  const { share, message } = useShare()
  return (
    <>
      <Button variant="secondary" disabled={!text} onClick={() => text && share(text)}>
        Share with AI
      </Button>
      {message && <p className="-mt-1 px-1 text-[13px] text-label-2">{message}</p>}
    </>
  )
}

/** Sheet to share recent workouts: last 4, last 8 or the last 4 weeks, with a preview of the text. */
export function ShareRecentSheet({ onClose }: { onClose: () => void }) {
  const { unit, aiQuestion } = useSettings()
  const [range, setRange] = useState<ShareRange>('last4')
  const data = useLiveQuery(async () => {
    const workouts = await getShareWorkouts(range)
    return {
      count: workouts.length,
      from: workouts[0]?.startedAt,
      to: workouts.at(-1)?.startedAt,
      text: workouts.length > 0 ? shareTextForWorkouts(workouts, unit, aiQuestion) : null,
    }
  }, [range, unit, aiQuestion])
  const { share, message } = useShare()

  return (
    <Sheet title="Share with AI" onClose={onClose}>
      <div className="mb-3">
        <Segmented label="Which workouts" options={SHARE_RANGES} value={range} onChange={setRange} />
      </div>
      <p className="mb-2 px-1 text-[15px] text-label-2">
        {!data
          ? '…'
          : data.count === 0
            ? 'No finished workouts in this range.'
            : `${countOf(data.count, 'workout')} · ${formatDay(data.from!)} – ${formatDay(data.to!)}`}
      </p>
      {data?.text && (
        <pre className="mb-3 max-h-56 overflow-auto rounded-lg bg-bg p-3 font-mono text-[11px] leading-snug whitespace-pre-wrap text-label-2 select-text">
          {data.text}
        </pre>
      )}
      <Button className="mb-2" disabled={!data?.text} onClick={() => data?.text && share(data.text)}>
        Share…
      </Button>
      {message && <p className="mb-2 px-1 text-[13px] text-label-2">{message}</p>}
      <p className="mb-2 px-1 text-[13px] text-label-2">
        Opens the share sheet: pick your AI app (Claude, ChatGPT, …), or Copy and paste it into a chat. Starts with your question for the AI (change it in Settings).
      </p>
    </Sheet>
  )
}
