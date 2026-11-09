import { Page } from '../../components/Page'
import { BackupSection } from '../import-export/BackupSection'

export function SettingsPage() {
  return (
    <Page title="Settings" back={{ to: '/train', label: 'Train' }}>
      <BackupSection />
    </Page>
  )
}
