import { useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { ListGroup } from '../../components/List'
import { Segmented } from '../../components/Segmented'
import { Stepper } from '../../components/Stepper'
import { SwitchRow } from '../../components/Switch'
import { MAX_REST_SECONDS, formatRest } from '../../lib/targets'
import { MIN_DEFAULT_REST_SECONDS, REST_STEP_SECONDS } from '../../lib/settings'
import { BackupSection } from '../import-export/BackupSection'
import { unlockAudio, playRestDone } from '../session/sound'
import { updateSettings, useSettings } from './settingsStore'

export function SettingsPage() {
  const settings = useSettings()
  const [persisted, setPersisted] = useState<boolean | null>(null)

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

      <BackupSection />

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
