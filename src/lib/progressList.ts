/**
 * Which exercises the Progress tab shows, and in what order. Pure.
 * `selection` undefined means "not customised": everything, most recent first.
 */
export function arrangeProgress<T extends { exercise: { id: number } }>(trained: readonly T[], selection: readonly number[] | undefined): { shown: T[]; hidden: T[] } {
  if (selection === undefined) return { shown: [...trained], hidden: [] }
  const byId = new Map(trained.map((t) => [t.exercise.id, t]))
  const picked = new Set(selection)
  return {
    // Ids without logged sets (e.g. a deleted exercise) are skipped.
    shown: selection.flatMap((id) => byId.get(id) ?? []),
    hidden: trained.filter((t) => !picked.has(t.exercise.id)),
  }
}

/** Reads a stored selection: a list of unique positive whole numbers, else undefined. */
export function parseProgressSelection(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = raw.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0)
  return [...new Set(ids)]
}
