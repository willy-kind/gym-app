const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

/** Case-insensitive match on every word of the query, sorted by name. */
export function filterByName<T extends { name: string }>(items: readonly T[], query: string): T[] {
  const words = norm(query).split(' ').filter(Boolean)
  return items
    .filter((item) => {
      const name = norm(item.name)
      return words.every((w) => name.includes(w))
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** The item whose name equals `name`, ignoring case and extra spaces. */
export function findByName<T extends { name: string }>(items: readonly T[], name: string): T | undefined {
  const n = norm(name)
  return items.find((item) => norm(item.name) === n)
}
