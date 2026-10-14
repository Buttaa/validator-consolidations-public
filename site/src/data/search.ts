// Text matching shared by the command line and record searches. Entity names carry spaces and punctuation
// ("Lido CM v2", "Bitmine:Bitgo") that people leave out when typing, so names also match by letters and digits.

/** Lowercase letters and digits only: "Lido CM v2", "lido cmv2" and "LIDO-CM-V2" all become "lidocmv2". */
export const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

const names = new Map<string, string>()

/** compact() for the few hundred entity names, cached because grids test them on every keystroke. */
export function compactName(name: string): string {
  let value = names.get(name)
  if (value === undefined) {
    value = compact(name)
    names.set(name, value)
  }
  return value
}

/** Columns whose values are entity or operator names, and therefore also match without spaces. */
export const NAME_COLUMNS = ['entity', 'source_entity', 'target_entity', 'sub_entity']

/** Every search word must appear in the row, as typed or, for name columns, by letters and digits. */
export function rowMatches(row: Record<string, unknown>, words: string[]): boolean {
  if (!words.length) return true
  const haystack = Object.values(row).join(' ').toLocaleLowerCase()
  return words.every((word) => {
    if (haystack.includes(word)) return true
    const key = compact(word)
    return key !== '' && NAME_COLUMNS.some((column) => typeof row[column] === 'string' && compactName(row[column] as string).includes(key))
  })
}

/** Search box text as lowercase words. */
export const searchWords = (search: string) => search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
