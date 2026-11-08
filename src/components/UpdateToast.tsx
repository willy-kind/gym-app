import { useRegisterSW } from 'virtual:pwa-register/react'

/** Registers the service worker and says once when the app is cached for offline use. */
export function UpdateToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({ immediate: true })

  if (!offlineReady) return null
  return (
    <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2 text-sm">
      <span>Ready to work offline</span>
      <button type="button" className="min-h-11 px-2 font-semibold text-accent" onClick={() => setOfflineReady(false)}>
        OK
      </button>
    </div>
  )
}
