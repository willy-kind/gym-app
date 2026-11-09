import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useNow } from '../../components/useNow'
import { isDone, MAX_OVERTIME_SECONDS, overtimeSeconds, progress, remainingSeconds, REST_ADJUST_SECONDS, type RestTimer } from '../../lib/restTimer'
import { formatRest } from '../../lib/targets'
import { adjustRest, clearRest, useRestTimer } from './restTimerStore'

/** Sticky rest bar above the tab bar, on every screen while a rest is running. */
export function RestTimerBar() {
  const timer = useRestTimer()
  return timer ? <RunningBar timer={timer} /> : null
}

function RunningBar({ timer }: { timer: RestTimer }) {
  // Ticks only while a timer exists. Every value is recomputed from the stored end time.
  const now = useNow(250)
  const navigate = useNavigate()
  const done = isDone(timer, now)
  const over = overtimeSeconds(timer, now)

  useEffect(() => {
    if (over > MAX_OVERTIME_SECONDS) clearRest()
  }, [over])

  return (
    <div
      role="timer"
      aria-live="off"
      className={`relative flex items-center gap-1 overflow-hidden border-t border-separator px-1 transition-colors ${done ? 'bg-success text-black' : 'bg-surface'}`}
      style={{ paddingLeft: 'max(0.25rem, env(safe-area-inset-left))', paddingRight: 'max(0.25rem, env(safe-area-inset-right))' }}
    >
      {!done && <div className="absolute inset-x-0 top-0 h-0.5 origin-left bg-accent" style={{ transform: `scaleX(${progress(timer, now)})` }} />}
      <BarButton label={`Remove ${REST_ADJUST_SECONDS} seconds`} disabled={done} onClick={() => adjustRest(-REST_ADJUST_SECONDS)} done={done}>
        −{REST_ADJUST_SECONDS}s
      </BarButton>
      <button
        type="button"
        onClick={() => void navigate(`/train/session/${timer.sessionId}`)}
        className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center"
        aria-label={done ? 'Rest over, go to workout' : 'Go to workout'}
      >
        <span className={`max-w-full truncate text-[12px] ${done ? 'font-semibold' : 'text-label-2'}`}>{done ? 'Rest over — next set' : `Rest · ${timer.exerciseName}`}</span>
        <span className="text-[26px] leading-none font-bold tabular-nums">{done ? `+${formatRest(over)}` : formatRest(remainingSeconds(timer, now))}</span>
      </button>
      <BarButton label={`Add ${REST_ADJUST_SECONDS} seconds`} onClick={() => adjustRest(REST_ADJUST_SECONDS)} done={done}>
        +{REST_ADJUST_SECONDS}s
      </BarButton>
      <BarButton label={done ? 'Dismiss' : 'Skip rest'} onClick={clearRest} done={done} bold>
        {done ? 'OK' : 'Skip'}
      </BarButton>
    </div>
  )
}

function BarButton({
  label,
  onClick,
  disabled,
  done,
  bold,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  done: boolean
  bold?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 min-w-14 rounded-lg px-2 text-[16px] tabular-nums active:opacity-60 disabled:opacity-30 ${bold ? 'font-semibold' : 'font-medium'} ${done ? 'text-black' : 'text-accent'}`}
    >
      {children}
    </button>
  )
}
