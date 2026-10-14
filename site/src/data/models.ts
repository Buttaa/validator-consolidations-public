// Pure view models. Every aggregate is per UTC day in summary.json, so any date range is computed here.
import type {
  CohortDay, CohortEntity, CohortSummary, DayEntry, DepositRow, DepositSummary, EntityDay, RequestEntityDay,
  RequestRow, RequestSummary, SubmissionDay,
} from './schema'
import { otherLast } from './public'

export const PREFIXES = ['0x00', '0x01', '0x02', 'Unknown'] as const
export interface DayRange { start: string; end: string }
export interface Preset { id: string; label: string; range: DayRange; days: string[] }

const zeroBucket = () => ({ wei: 0n, count: 0 })
const bigSum = (values: Iterable<string | bigint>) => { let s = 0n; for (const v of values) s += BigInt(v); return s }

export function daysInRange(days: DayEntry[], range: DayRange): DayEntry[] {
  return days.filter((d) => d.day >= range.start && d.day <= range.end)
}

const DAY_MS = 86400000
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY_MS)

export interface AxisBreak { index: number; missing: number; from: string; to: string }

/** Where a chart's day list skips calendar days, so the axis can show the discontinuity instead of hiding it. */
export function axisBreaks(days: string[]): AxisBreak[] {
  const breaks: AxisBreak[] = []
  for (let i = 1; i < days.length; i++) {
    const missing = dayDiff(days[i - 1], days[i]) - 1
    if (missing > 0) breaks.push({ index: i, missing, from: days[i - 1], to: days[i] })
  }
  return breaks
}

/** Consecutive uncollected days, merged so one shaded band replaces a row of empty columns. */
export function notCollectedRuns(days: string[], collected: (day: string) => boolean): { start: number; end: number; days: number }[] {
  const runs: { start: number; end: number; days: number }[] = []
  let start = -1
  for (let i = 0; i <= days.length; i++) {
    const missing = i < days.length && !collected(days[i])
    if (missing && start < 0) start = i
    if (!missing && start >= 0) {
      runs.push({ start, end: i - 1, days: i - start })
      start = -1
    }
  }
  return runs
}

const shiftDay = (iso: string, by: number) => new Date(Date.parse(iso + 'T00:00:00Z') + by * DAY_MS).toISOString().slice(0, 10)

/** Trailing calendar windows ending on the newest collected day (a partial today counts); uncollected days stay out of `days`. */
export function presets(days: DayEntry[]): Preset[] {
  const collected = days.filter((d) => d.state !== 'not_collected')
  if (!collected.length) return []
  const end = collected[collected.length - 1].day
  return [7, 30, 90].map((n) => {
    const range = { start: shiftDay(end, 1 - n), end }
    return { id: `last${n}`, label: `Last ${n} days`, range, days: daysInRange(collected, range).map((d) => d.day) }
  })
}

export function dayOfEpochMap(days: DayEntry[]): Map<number, string> {
  return new Map(days.map((d) => [d.reference_epoch, d.day]))
}

// --- Deposits -------------------------------------------------------------

export interface EntityRow {
  entity: string; wei: string; eth01_wei: string; eth02_wei: string; eth00_wei: string; unknown_wei: string
  count: number; share: string
}

export function entityBreakdown(entityDaily: EntityDay[], days: Set<string>, sortField: keyof EntityRow = 'wei'): EntityRow[] {
  const byEntity = new Map<string, { entity: string; wei: bigint; eth01_wei: bigint; eth02_wei: bigint; eth00_wei: bigint; unknown_wei: bigint; count: number }>()
  let total = 0n
  for (const row of entityDaily) {
    if (!days.has(row.day)) continue
    const item = byEntity.get(row.entity) || { entity: row.entity, wei: 0n, eth01_wei: 0n, eth02_wei: 0n, eth00_wei: 0n, unknown_wei: 0n, count: 0 }
    const amount = BigInt(row.wei)
    item.wei += amount
    item.count += row.count
    total += amount
    const field = ({ '0x00': 'eth00_wei', '0x01': 'eth01_wei', '0x02': 'eth02_wei' } as const)[row.prefix as '0x00' | '0x01' | '0x02'] || 'unknown_wei'
    item[field] += amount
    byEntity.set(row.entity, item)
  }
  const sorted = [...byEntity.values()].sort((a, b) => {
    if (otherLast(a.entity, b.entity)) return otherLast(a.entity, b.entity)
    const x = a[sortField as keyof typeof a]
    const y = b[sortField as keyof typeof b]
    if (x === y) return a.entity.localeCompare(b.entity)
    return x > y ? -1 : 1
  })
  return sorted.map((item) => {
    const share = total ? Number((item.wei * 10000n + total / 2n) / total) / 100 : 0
    return {
      entity: item.entity, wei: item.wei.toString(), eth01_wei: item.eth01_wei.toString(), eth02_wei: item.eth02_wei.toString(),
      eth00_wei: item.eth00_wei.toString(), unknown_wei: item.unknown_wei.toString(), count: item.count, share: share.toFixed(2) + '%',
    }
  })
}

export interface DepositTotals {
  total_wei: bigint; count: number; by_prefix: Record<string, bigint>; counts: Record<string, number>; reclassified: number
}

export function depositTotals(dep: DepositSummary, days: string[]): DepositTotals {
  const by_prefix: Record<string, bigint> = {}
  const counts: Record<string, number> = {}
  let total = 0n
  let count = 0
  let reclassified = 0
  for (const day of days) {
    for (const [prefix, wei] of Object.entries(dep.daily[day] || {})) {
      by_prefix[prefix] = (by_prefix[prefix] || 0n) + BigInt(wei)
      total += BigInt(wei)
    }
    for (const [prefix, n] of Object.entries(dep.daily_counts[day] || {})) {
      counts[prefix] = (counts[prefix] || 0) + n
      count += n
    }
    reclassified += dep.reclassified_by_day[day] || 0
  }
  return { total_wei: total, count, by_prefix, counts, reclassified }
}

export type DailyBuckets = Record<string, Record<string, { wei: bigint; count: number }>>

export function selectedDaily(entityDaily: EntityDay[], days: string[], entity = ''): DailyBuckets {
  const result: DailyBuckets = Object.fromEntries(days.map((day) => [day, Object.fromEntries(PREFIXES.map((p) => [p, zeroBucket()]))]))
  for (const row of entityDaily) {
    if (!(row.day in result) || (entity && row.entity !== entity)) continue
    const bucket = result[row.day][row.prefix] || (result[row.day][row.prefix] = zeroBucket())
    bucket.wei += BigInt(row.wei)
    bucket.count += row.count
  }
  return result
}

export interface Bucket { wei: bigint; count: number }
export interface EntitySplit { entity: string; buckets: Record<string, Bucket>; total: Bucket }

/** One day's deposits per entity, split by credential type, largest first by the chart's metric. */
export function daySplits(rows: EntityDay[], metric: 'wei' | 'count'): EntitySplit[] {
  const byEntity = new Map<string, EntitySplit>()
  for (const row of rows) {
    const split = byEntity.get(row.entity) || { entity: row.entity, buckets: {}, total: zeroBucket() }
    const bucket = split.buckets[row.prefix] || (split.buckets[row.prefix] = zeroBucket())
    bucket.wei += BigInt(row.wei)
    bucket.count += row.count
    split.total.wei += BigInt(row.wei)
    split.total.count += row.count
    byEntity.set(row.entity, split)
  }
  const size = (split: EntitySplit) => (metric === 'wei' ? split.total.wei : BigInt(split.total.count))
  return [...byEntity.values()].sort((a, b) => otherLast(a.entity, b.entity) || (size(a) === size(b) ? a.entity.localeCompare(b.entity) : size(a) > size(b) ? -1 : 1))
}

/** Sum several splits' buckets for one credential type (or their totals when prefix is omitted). */
export function sumSplits(splits: EntitySplit[], prefix?: string): Bucket {
  const sum = zeroBucket()
  for (const split of splits) {
    const bucket = prefix ? split.buckets[prefix] : split.total
    if (!bucket) continue
    sum.wei += bucket.wei
    sum.count += bucket.count
  }
  return sum
}

export function recentDepositRows(rows: DepositRow[], credited: boolean): (DepositRow & { chart_prefix: string })[] {
  return rows
    .filter((r) => r.included)
    .map((r) => ({ ...r, chart_prefix: credited ? r.credited_prefix : r.submitted_prefix }))
    .sort((a, b) => b.slot - a.slot || Number(b.id.split(':')[1]) - Number(a.id.split(':')[1]))
}

// --- Requests -------------------------------------------------------------

export interface RequestEntityRow {
  entity: string; requests: number; completed: number; transfer_wei: bigint
  switches_completed: number; switch_effective_wei: bigint; switch_balance_count: number
}

export function requestEntities(entityDaily: RequestEntityDay[], days: string[]): RequestEntityRow[] {
  const selected = new Set(days)
  const byEntity = new Map<string, RequestEntityRow>()
  for (const row of entityDaily) {
    if (!selected.has(row.day)) continue
    const item = byEntity.get(row.entity) || { entity: row.entity, requests: 0, completed: 0, transfer_wei: 0n, switches_completed: 0, switch_effective_wei: 0n, switch_balance_count: 0 }
    item.requests += row.requests
    item.completed += row.completed
    item.transfer_wei += BigInt(row.transfer_wei)
    item.switches_completed += row.switches_completed
    item.switch_effective_wei += BigInt(row.switch_effective_wei)
    item.switch_balance_count += row.switch_balance_count
    byEntity.set(row.entity, item)
  }
  return [...byEntity.values()].sort((a, b) => otherLast(a.entity, b.entity) ||
    (a.transfer_wei === b.transfer_wei ? b.switches_completed - a.switches_completed || a.entity.localeCompare(b.entity) : a.transfer_wei > b.transfer_wei ? -1 : 1))
}

export function requestTotals(req: RequestSummary, days: string[]) {
  let consolidations = 0
  let switches = 0
  for (const day of days) {
    consolidations += req.daily[day]?.consolidation || 0
    switches += req.daily[day]?.compounding_switch || 0
  }
  const entities = requestEntities(req.entity_daily, days)
  return {
    consolidations, switches,
    completed: entities.reduce((n, e) => n + e.completed, 0),
    switches_completed: entities.reduce((n, e) => n + e.switches_completed, 0),
    transfer_wei: bigSum(entities.map((e) => e.transfer_wei)),
  }
}

/** Consolidation statuses in stack order; completed and queued always show, any other status only when it occurs. */
export const CONSOLIDATION_STATUSES = ['completed', 'queued', 'rejected']

export function consolidationStatusesIn(req: RequestSummary, days: string[]): string[] {
  const seen = new Set(['completed', 'queued'])
  for (const day of days) {
    for (const key of Object.keys(req.statuses_daily[day] || {})) {
      if (key.startsWith('consolidation / ')) seen.add(key.slice('consolidation / '.length))
    }
  }
  return [...CONSOLIDATION_STATUSES.filter((s) => seen.has(s)), ...[...seen].filter((s) => !CONSOLIDATION_STATUSES.includes(s)).sort()]
}

export interface StatusSplit { entity: string; statuses: Record<string, number>; total: number; transfer_wei: bigint }

/** One day's consolidation requests per entity by status, most requests first. */
export function consolidationSplits(entityDaily: RequestEntityDay[], day: string): StatusSplit[] {
  const splits: StatusSplit[] = []
  for (const row of entityDaily) {
    if (row.day !== day || !row.consolidation_statuses) continue
    const total = Object.values(row.consolidation_statuses).reduce((n, c) => n + c, 0)
    if (total) splits.push({ entity: row.entity, statuses: row.consolidation_statuses, total, transfer_wei: BigInt(row.transfer_wei) })
  }
  return splits.sort((a, b) => otherLast(a.entity, b.entity) || b.total - a.total || a.entity.localeCompare(b.entity))
}

export function recentConsolidationRows(rows: RequestRow[]): RequestRow[] {
  return rows
    .filter((r) => r.type === 'consolidation' && r.status === 'completed' && r.processed_slot != null)
    .sort((a, b) => (b.processed_slot as number) - (a.processed_slot as number) || b.slot - a.slot)
}

// --- Cohort balances ------------------------------------------------------

export interface CohortRange { daily: CohortDay[]; latest_epoch: number | null; histogram: Record<string, number>; entities: CohortEntity[] }

export function cohortInRange(cohort: CohortSummary, dayOfEpoch: Map<number, string>, days: string[]): CohortRange {
  const selected = new Set(days)
  const daily = cohort.daily.filter((d) => selected.has(dayOfEpoch.get(d.epoch) || ''))
  let latest: number | null = null
  for (const d of daily) if (cohort.by_epoch[String(d.epoch)]) latest = d.epoch
  const snapshot = latest === null ? { histogram: {}, entities: [] } : cohort.by_epoch[String(latest)]
  return { daily, latest_epoch: latest, histogram: snapshot.histogram, entities: snapshot.entities }
}

// --- Submissions ----------------------------------------------------------

export function submissionSummary(rows: SubmissionDay[], days: string[], prefix: string) {
  const selected = new Set(days)
  const entities = new Map<string, { entity: string; wei: bigint; count: number }>()
  let count = 0
  let total = 0n
  for (const r of rows) {
    if (!selected.has(r.day) || (prefix && r.prefix !== prefix)) continue
    const e = entities.get(r.entity) || { entity: r.entity, wei: 0n, count: 0 }
    e.wei += BigInt(r.wei)
    e.count += r.count
    entities.set(r.entity, e)
    count += r.count
    total += BigInt(r.wei)
  }
  return { entities: [...entities.values()].sort((a, b) => otherLast(a.entity, b.entity) || (a.wei === b.wei ? a.entity.localeCompare(b.entity) : a.wei > b.wei ? -1 : 1)), count, total_wei: total }
}
