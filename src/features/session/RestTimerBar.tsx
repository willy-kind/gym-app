import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useNow } from '../../components/useNow'
import { isDone, MAX_OVERTIME_SECONDS, overtimeSeconds, progress, remainingSeconds, REST_ADJUST_SECONDS, type RestTimer } from '../../lib/restTimer'
import { formatRest } from '../../lib/targets'
import { adjustRest, clearRest, useRestTimer } from './restTimerStore'
import { getSettings } from '../settings/settingsStore'
import { playRestDone } from './sound'

/**
 * Sticky rest bar above the tab bar while a rest is running and you're away from
 * the workout. On the workout screen itself the timer lives in the set panel.
 */
export function RestTimerBar() {
  const timer = useRestTimer()
  const { pathname } = useLocation()
  if (!timer || pathname === `/train/session/${timer.sessionId}`) return null
  return <RestTimerView timer={timer} placement="bar" />
}

/** The rest timer as the top strip of the set panel, for the workout it belongs to. */
export function PanelRestTimer({ sessionId }: { sessionId: number }) {
  const timer = useRestTimer()
  if (!timer || timer.sessionId !== sessionId) return null
  return <RestTimerView timer={timer} placement="panel" />
}

// Shared by both placements so moving between screens never beeps twice for one rest.
let beepedFor: number | null = null

function RestTimerView({ timer, placement }: { timer: RestTimer; placement: 'bar' | 'panel' }) {
  // Ticks only while a timer is shown. Every value is recomputed from the stored end time.
  const now = useNow(250)
  const navigate = useNavigate()
  const done = isDone(timer, now)
  const over = overtimeSeconds(timer, now)

  useEffect(() => {
    if (over > MAX_OVERTIME_SECONDS) clearRest()
  }, [over])

  // Beep once as the rest runs out, if enabled. Not when coming back to an
  // already-finished timer (the app was in the background when it ended).
  useEffect(() => {
    if (done && over <= 2 && beepedFor !== timer.endsAt && getSettings().timerSound) {
      beepedFor = timer.endsAt
      playRestDone()
    }
  }, [done, over, timer.endsAt])

  const inPanel = placement === 'panel'
  const readout = (
    <>
      <span className={`max-w-full truncate text-[12px] ${done ? 'font-semibold' : 'text-label-2'}`}>
        {done ? (inPanel ? 'Rest over' : 'Rest over — next set') : `Rest · ${timer.exerciseName}`}
      </span>
      <span className="text-[26px] leading-none font-bold tabular-nums">{done ? `+${formatRest(over)}` : formatRest(remainingSeconds(timer, now))}</span>
    </>
  )
  const middle = 'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center'

  return (
    <div
      role="timer"
      aria-live="off"
      className={`relative flex items-center gap-1 overflow-hidden px-1 transition-colors ${
        inPanel ? '-mx-4 -mt-3 mb-3 rounded-t-2xl border-b border-separator' : 'border-t border-separator'
      } ${done ? 'bg-success text-black' : inPanel ? 'bg-surface-2/60' : 'bg-surface'}`}
      style={inPanel ? undefined : { paddingLeft: 'max(0.25rem, env(safe-area-inset-left))', paddingRight: 'max(0.25rem, env(safe-area-inset-right))' }}
    >
      {!done && <div className="absolute inset-x-0 top-0 h-0.5 origin-left bg-accent" style={{ transform: `scaleX(${progress(timer, now)})` }} />}
      <BarButton label={`Remove ${REST_ADJUST_SECONDS} seconds`} disabled={done} onClick={() => adjustRest(-REST_ADJUST_SECONDS)} done={done}>
        −{REST_ADJUST_SECONDS}s
      </BarButton>
      {inPanel ? (
        <div className={middle}>{readout}</div>
      ) : (
        <button
          type="button"
          onClick={() => void navigate(`/train/session/${timer.sessionId}`)}
          className={middle}
          aria-label={done ? 'Rest over, go to workout' : 'Go to workout'}
        >
          {readout}
        </button>
      )}
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
