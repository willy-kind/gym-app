import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/**
 * Re-runs `query` whenever the tables it reads change, using Dexie's built-in liveQuery.
 * Returns undefined until the first result arrives.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [state, setState] = useState<{ key: string; value: T } | undefined>(undefined)
  const key = JSON.stringify(deps)

  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (value) => setState({ key, value }),
      error: (err: unknown) => console.error('liveQuery failed', err),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the caller's dependency list
  }, [key])

  // Don't show the previous screen's data while a new query (e.g. another day) loads.
  return state?.key === key ? state.value : undefined
}
