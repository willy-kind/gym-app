/** Returns a copy of `items` with the item at `index` moved by `delta` places (clamped). */
export function moveItem<T>(items: readonly T[], index: number, delta: number): T[] {
  const result = [...items]
  if (index < 0 || index >= items.length) return result
  const target = Math.min(items.length - 1, Math.max(0, index + delta))
  const [item] = result.splice(index, 1)
  result.splice(target, 0, item as T)
  return result
}

/** Pairs each id with its new 0-based order, skipping ones whose order is unchanged. */
export function orderUpdates<T extends { id: number; order: number }>(items: readonly T[]): { id: number; order: number }[] {
  return items.flatMap((item, i) => (item.order === i ? [] : [{ id: item.id, order: i }]))
}
