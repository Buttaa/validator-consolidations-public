/** The public snapshot shows only the first few rows of any table; the rest is on the beaconcha.in API. */
export const PUBLIC_ROWS = 5
export const API_DOCS = 'https://docs.beaconcha.in'

/**
 * Entities outside the ones the public site names are summed into this one row per day, so totals and
 * charts stay exact. It always sorts last and never appears as a named entity.
 */
export const OTHER = 'Other entities'
export const isOther = (entity: string) => entity === OTHER

/** Sort helper: the Other bucket goes last whatever the metric. */
export const otherLast = (a: string, b: string) => Number(isOther(a)) - Number(isOther(b))

/** Label for a chart's remainder row: with the Other bucket inside, the number of entities is unknown. */
export const restLabel = (rest: string[]) => rest.some(isOther) ? OTHER : `Other · ${rest.length.toLocaleString('en-US')} entities`
