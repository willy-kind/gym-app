import { useEffect, useId, useState } from 'react'
import { Page } from '../../components/Page'
import { ListGroup } from '../../components/List'
import { Segmented } from '../../components/Segmented'
import { Stepper } from '../../components/Stepper'
import { SwitchRow } from '../../components/Switch'
import { MAX_REST_SECONDS, formatRest } from '../../lib/targets'
import { MIN_DEFAULT_REST_SECONDS, REST_STEP_SECONDS } from '../../lib/settings'
import { DEFAULT_AI_QUESTION, MAX_AI_QUESTION_LENGTH } from '../../lib/aiExport'
import { BackupSection } from '../import-export/BackupSection'
import { StrongImportSection } from '../import-export/StrongImportSection'
import { unlockAudio, playRestDone } from '../session/sound'
import { updateSettings, useSettings } from './settingsStore'
import { wakeLockSupported } from '../../components/useWakeLock'

export function SettingsPage() {
  const settings = useSettings()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const questionId = useId()

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null))
  }, [])

  return (
    <Page title="Settings" back={{ to: '/train', label: 'Train' }}>
      <ListGroup header="Units" footer="Weights are always stored in kg; this only changes how they’re shown and entered.">
        <li className="p-2">
          <Segmented
            label="Weight unit"
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            value={settings.unit}
            onChange={(unit) => updateSettings({ unit })}
          />
        </li>
      </ListGroup>

      <ListGroup header="Screen">
        <SwitchRow
          label="Keep screen awake"
          detail={wakeLockSupported ? 'While the app is open, the phone won’t dim or lock. Uses a bit more battery.' : 'Not supported on this phone.'}
          on={settings.keepAwake && wakeLockSupported}
          onChange={(keepAwake) => wakeLockSupported && updateSettings({ keepAwake })}
        />
      </ListGroup>

      <ListGroup header="Rest timer" footer="Default rest is used for exercises without a rest target, and as the starting rest when you add an exercise to a program day.">
        <li className="px-4">
          <Stepper
            label="Default rest"
            value={settings.defaultRestSeconds}
            onChange={(defaultRestSeconds) => updateSettings({ defaultRestSeconds })}
            step={REST_STEP_SECONDS}
            min={MIN_DEFAULT_REST_SECONDS}
            max={MAX_REST_SECONDS}
            format={formatRest}
          />
        </li>
        <SwitchRow
          label="Sound when rest is over"
          detail="Only while the app is open. The silent switch mutes it."
          on={settings.timerSound}
          onChange={(timerSound) => {
            updateSettings({ timerSound })
            if (timerSound) {
              // This tap unlocks audio on iOS, and lets you hear what it sounds like.
              unlockAudio()
              setTimeout(playRestDone, 50)
            }
          }}
        />
      </ListGroup>

      <ListGroup
        header="AI feedback"
        footer="Starts the text from “Share with AI”. A note on how to read the log (units, W, PR, rest) is always added after it. Leave it empty to use the default."
      >
        <li className="px-4 pt-3 pb-2">
          <label htmlFor={questionId} className="mb-1.5 block text-[13px] text-label-2">
            Question for the AI
          </label>
          <textarea
            id={questionId}
            rows={6}
            maxLength={MAX_AI_QUESTION_LENGTH}
            value={settings.aiQuestion ?? DEFAULT_AI_QUESTION}
            onChange={(e) => updateSettings({ aiQuestion: e.target.value === DEFAULT_AI_QUESTION ? undefined : e.target.value })}
            className="w-full resize-none rounded-lg bg-bg p-3 text-[16px] leading-snug outline-none"
          />
          {settings.aiQuestion !== undefined && (
            <button type="button" onClick={() => updateSettings({ aiQuestion: undefined })} className="min-h-11 text-[15px] font-semibold text-accent active:opacity-60">
              Reset to default
            </button>
          )}
        </li>
      </ListGroup>

      <BackupSection />

      <StrongImportSection />

      {persisted !== null && (
        <p className="mt-4 px-1 text-[13px] text-label-2">
          {persisted
            ? 'Storage: persistent. iOS won’t clear this app’s data to free up space.'
            : 'Storage: not marked persistent yet. Adding the app to the Home Screen and using it regularly helps; keep backups either way.'}
        </p>
      )}
    </Page>
  )
}
