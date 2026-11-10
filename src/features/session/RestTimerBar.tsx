import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useNow } from '../../components/useNow'
import { isDone, overtimeSeconds, REST_OVER_SHOW_SECONDS, progress, remainingSeconds, REST_ADJUST_SECONDS, type RestTimer } from '../../lib/restTimer'
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

/** The rest timer at the top of the set panel (a progress ring), for the workout it belongs to. */
export function PanelRestTimer({ sessionId, next }: { sessionId: number; next: string }) {
  const timer = useRestTimer()
  if (!timer || timer.sessionId !== sessionId) return null
  return <RestTimerView timer={timer} placement="panel" next={next} />
}

// Shared by both placements so moving between screens never repeats the alarm.
let alarmedFor: number | null = null

function RestTimerView({ timer, placement, next = '' }: { timer: RestTimer; placement: 'bar' | 'panel'; next?: string }) {
  // Ticks only while a timer is shown. Every value is recomputed from the stored end time.
  const now = useNow(250)
  const navigate = useNavigate()
  const done = isDone(timer, now)
  const over = overtimeSeconds(timer, now)

  // When the rest runs out it shows "Go" for a moment, then clears itself: the
  // next set starts without a tap.
  useEffect(() => {
    if (done && over >= REST_OVER_SHOW_SECONDS) clearRest()
  }, [done, over])

  // Alarm once as the rest runs out, if enabled. Not when coming back to a
  // finished timer (the app was in the background when it ended).
  useEffect(() => {
    if (done && over <= 2 && alarmedFor !== timer.endsAt && getSettings().timerSound) {
      alarmedFor = timer.endsAt
      void playRestDone(getSettings().alarmMusic)
    }
  }, [done, over, timer.endsAt])

  if (placement === 'panel') return <PanelRing timer={timer} now={now} done={done} next={next} />

  return (
    <div
      role="timer"
      aria-live="off"
      className={`relative flex items-center gap-1 overflow-hidden border-t border-separator px-1 transition-colors ${done ? 'bg-success text-on-success' : 'bg-surface'}`}
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
        <span className={`max-w-full truncate text-[12px] ${done ? 'font-semibold' : 'text-label-2'}`}>{done ? 'Rest over' : `Rest · ${timer.exerciseName}`}</span>
        <span className="text-[26px] leading-none font-bold tabular-nums">{done ? 'Go' : formatRest(remainingSeconds(timer, now))}</span>
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

const RING_R = 28
const RING_C = 2 * Math.PI * RING_R

/**
 * The rest timer at the top of the set panel: a progress ring with the time, what's
 * next (the panel's set), and pill buttons. It replaces the panel's own title row.
 */
function PanelRing({ timer, now, done, next }: { timer: RestTimer; now: number; done: boolean; next: string }) {
  const left = done ? 1 : progress(timer, now)
  return (
    <div role="timer" aria-live="off" className="mb-3 flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="6" style={{ stroke: 'var(--separator)' }} />
          <circle
            cx="32"
            cy="32"
            r={RING_R}
            fill="none"
            style={{ stroke: done ? 'var(--success)' : 'var(--accent)' }}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${left * RING_C} ${RING_C}`}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[17px] font-bold tabular-nums">
          {done ? 'Go' : formatRest(remainingSeconds(timer, now))}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] ${done ? 'font-semibold text-success' : 'text-label-2'}`}>{done ? 'Rest over · go' : 'Resting · then'}</p>
        <p className="truncate text-[15px] font-semibold">{next}</p>
      </div>
      {/* Nothing to press once the rest is over: it clears itself in a moment. */}
      {!done && (
        <>
          <PillButton label={`Remove ${REST_ADJUST_SECONDS} seconds`} onClick={() => adjustRest(-REST_ADJUST_SECONDS)}>
            −{REST_ADJUST_SECONDS}
          </PillButton>
          <PillButton label={`Add ${REST_ADJUST_SECONDS} seconds`} onClick={() => adjustRest(REST_ADJUST_SECONDS)}>
            +{REST_ADJUST_SECONDS}
          </PillButton>
          <PillButton label="Skip rest" onClick={clearRest}>
            Skip
          </PillButton>
        </>
      )}
    </div>
  )
}

function PillButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="min-h-11 min-w-11 shrink-0 rounded-full bg-surface-2 px-3 text-[15px] font-semibold tabular-nums active:opacity-60"
    >
      {children}
    </button>
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
      className={`min-h-12 min-w-14 rounded-lg px-2 text-[16px] tabular-nums active:opacity-60 disabled:opacity-30 ${bold ? 'font-semibold' : 'font-medium'} ${done ? 'text-on-success' : 'text-accent'}`}
    >
      {children}
    </button>
  )
}
