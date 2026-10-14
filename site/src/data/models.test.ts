import { describe, expect, test } from 'vitest'
import { compactNumber, eth, exactEth } from './eth'
import {
  axisBreaks, cohortInRange, consolidationSplits, consolidationStatusesIn, dayDiff, daySplits, depositTotals, entityBreakdown,
  notCollectedRuns, presets, sumSplits, recentConsolidationRows, recentDepositRows, requestEntities, requestTotals, selectedDaily, submissionSummary,
} from './models'
import type { CohortSummary, DayEntry, DepositSummary, RequestSummary } from './schema'

const ETH = 10n ** 18n

describe('ETH formatting', () => {
  test('compact labels avoid locale-ambiguous thousands punctuation', () => {
    expect(eth('7645952347439000000000')).toBe('7.646k')
    expect(eth('343070027528657000000000')).toBe('343.07k')
    expect(eth((31n * ETH).toString())).toBe('31')
    expect(eth(null)).toBe('Unavailable')
  })
  test('exact amounts keep every wei digit', () => {
    expect(exactEth('7645952347439000000000')).toBe('7 645.952347439')
    expect(exactEth('1000000000000000000')).toBe('1.0')
  })
  test('plain counts compact above a thousand', () => {
    expect(compactNumber(950)).toBe('950')
    expect(compactNumber(12_400)).toBe('12.4k')
    expect(compactNumber(2_500_000)).toBe('2.5m')
  })
})

const entityDaily = [
  { day: '2026-06-10', entity: 'A', prefix: '0x01', wei: '20', count: 2 },
  { day: '2026-06-10', entity: 'A', prefix: '0x02', wei: '10', count: 1 },
  { day: '2026-06-11', entity: 'A', prefix: '0x00', wei: '5', count: 1 },
  { day: '2026-06-11', entity: 'B', prefix: '0x02', wei: '60', count: 1 },
  { day: '2026-06-12', entity: 'A', prefix: 'Unknown', wei: '5', count: 1 },
]
const deposits: DepositSummary = {
  total_wei: '100', count: 6, by_prefix: { '0x01': '20', '0x02': '70', '0x00': '5', Unknown: '5' },
  daily: { '2026-06-10': { '0x01': '20', '0x02': '10' }, '2026-06-11': { '0x00': '5', '0x02': '60' }, '2026-06-12': { Unknown: '5' } },
  daily_counts: { '2026-06-10': { '0x01': 2, '0x02': 1 }, '2026-06-11': { '0x00': 1, '0x02': 1 }, '2026-06-12': { Unknown: 1 } },
  entity_daily: entityDaily, reclassified_count: 1, reclassified_by_day: { '2026-06-11': 1 }, entities: [],
}

describe('day splits by entity and credential', () => {
  const rows = [
    { day: '2026-09-12', entity: 'Lido', prefix: '0x01', wei: '600', count: 6 },
    { day: '2026-09-12', entity: 'Kiln', prefix: '0x01', wei: '300', count: 3 },
    { day: '2026-09-12', entity: 'Kiln', prefix: '0x02', wei: '400', count: 1 },
    { day: '2026-09-12', entity: 'Tiny', prefix: '0x00', wei: '32', count: 1 },
  ]
  test('each entity carries its own split across credential types, largest first', () => {
    const got = daySplits(rows, 'wei')
    expect(got.map((s) => s.entity)).toEqual(['Kiln', 'Lido', 'Tiny'])
    expect(got[0].buckets['0x01']).toEqual({ wei: 300n, count: 3 })
    expect(got[0].buckets['0x02']).toEqual({ wei: 400n, count: 1 })
    expect(got[0].total).toEqual({ wei: 700n, count: 4 })
    expect(got[2].buckets['0x01']).toBeUndefined()
  })
  test('ordering follows the chart metric, and sums fold the tail per credential type', () => {
    const byEvents = daySplits(rows, 'count')
    expect(byEvents.map((s) => s.entity)).toEqual(['Lido', 'Kiln', 'Tiny'])
    expect(sumSplits(byEvents.slice(1), '0x01')).toEqual({ wei: 300n, count: 3 })
    expect(sumSplits(byEvents.slice(1))).toEqual({ wei: 732n, count: 5 })
  })
})

describe('deposit range models', () => {
  test('entity breakdown over every day matches the old dashboard', () => {
    const rows = entityBreakdown(entityDaily, new Set(['2026-06-10', '2026-06-11', '2026-06-12']), 'wei')
    expect(rows.map((r) => r.entity)).toEqual(['B', 'A'])
    expect([rows[1].eth01_wei, rows[1].eth02_wei, rows[1].eth00_wei, rows[1].unknown_wei, rows[1].wei, rows[1].share])
      .toEqual(['20', '10', '5', '5', '40', '40.00%'])
    expect(rows.reduce((n, r) => n + BigInt(r.wei), 0n)).toBe(100n)
    expect(entityBreakdown(entityDaily, new Set(['2026-06-10']), 'eth01_wei')[0].entity).toBe('A')
    expect(entityBreakdown([], new Set())).toEqual([])
  })
  test('range totals only count selected days', () => {
    const totals = depositTotals(deposits, ['2026-06-10', '2026-06-11'])
    expect(totals.total_wei).toBe(95n)
    expect(totals.count).toBe(5)
    expect(totals.by_prefix['0x02']).toBe(70n)
    expect(totals.reclassified).toBe(1)
  })
  test('daily selection fills missing days and filters by entity', () => {
    const days = selectedDaily(entityDaily, ['2026-06-10', '2026-06-11', '2026-06-13'], 'B')
    expect(days['2026-06-11']['0x02']).toEqual({ wei: 60n, count: 1 })
    expect(days['2026-06-10']['0x02']).toEqual({ wei: 0n, count: 0 })
    expect(days['2026-06-13']['0x01']).toEqual({ wei: 0n, count: 0 })
  })
})

describe('recent activity ordering', () => {
  test('recent deposits follow the credential toggle and newest slot first', () => {
    const rows = [
      { id: '2:1', slot: 2, included: true, submitted_prefix: '0x00', credited_prefix: '0x02' },
      { id: '3:0', slot: 3, included: false, submitted_prefix: '0x01', credited_prefix: '0x01' },
      { id: '1:0', slot: 1, included: true, submitted_prefix: '0x01', credited_prefix: '0x01' },
    ]
    expect(recentDepositRows(rows as never, true).map((r) => r.slot)).toEqual([2, 1])
    expect(recentDepositRows(rows as never, true)[0].chart_prefix).toBe('0x02')
    expect(recentDepositRows(rows as never, false)[0].chart_prefix).toBe('0x00')
  })
  test('recent consolidations exclude switches and unsettled requests', () => {
    const rows = [
      { type: 'consolidation', status: 'completed', processed_slot: 20, slot: 1 },
      { type: 'compounding_switch', status: 'completed', processed_slot: 30, slot: 1 },
      { type: 'consolidation', status: 'queued', processed_slot: null, slot: 2 },
      { type: 'consolidation', status: 'completed', processed_slot: 25, slot: 2 },
    ]
    expect(recentConsolidationRows(rows as never).map((r) => r.processed_slot)).toEqual([25, 20])
  })
})

const requests: RequestSummary = {
  count: 3, consolidations: 2, switches: 1, completed_transfer_wei: '96', statuses: {},
  statuses_daily: { '2026-06-10': { 'consolidation / completed': 1 }, '2026-06-11': { 'consolidation / completed': 1, 'compounding_switch / completed': 1 } },
  daily: { '2026-06-10': { consolidation: 1 }, '2026-06-11': { consolidation: 1, compounding_switch: 1 } },
  entity_daily: [
    { day: '2026-06-10', entity: 'A', requests: 1, completed: 1, transfer_wei: '64', switches_completed: 0, switch_effective_wei: '0', switch_balance_count: 0 },
    { day: '2026-06-11', entity: 'A', requests: 1, completed: 1, transfer_wei: '32', switches_completed: 0, switch_effective_wei: '0', switch_balance_count: 0 },
    { day: '2026-06-11', entity: 'B', requests: 1, completed: 0, transfer_wei: '0', switches_completed: 1, switch_effective_wei: '48', switch_balance_count: 1 },
  ],
  entities: [],
}

describe('request range models', () => {
  test('entities aggregate across selected days', () => {
    const rows = requestEntities(requests.entity_daily, ['2026-06-10', '2026-06-11'])
    expect(rows[0]).toMatchObject({ entity: 'A', completed: 2, transfer_wei: 96n })
    expect(rows[1]).toMatchObject({ entity: 'B', switches_completed: 1, switch_effective_wei: 48n, switch_balance_count: 1 })
    expect(requestEntities(requests.entity_daily, ['2026-06-11'])[0].transfer_wei).toBe(32n)
  })
  test('totals separate included requests from completed outcomes', () => {
    const totals = requestTotals(requests, ['2026-06-11'])
    expect(totals).toEqual({ consolidations: 1, switches: 1, completed: 1, switches_completed: 1, transfer_wei: 32n })
  })
})

describe('daily consolidation models', () => {
  const day = '2026-09-21'
  const row = (entity: string, statuses?: Record<string, number>, transfer = '0') => ({
    day, entity, requests: 0, completed: statuses?.completed || 0, transfer_wei: transfer, switches_completed: 0,
    switch_effective_wei: '0', switch_balance_count: 0, consolidation_statuses: statuses,
  })
  test('splits a day by entity and status, most requests first, skipping switch-only and older rows', () => {
    const rows = [row('A', { completed: 1 }, '32'), row('Lido CM v2', { queued: 2971, completed: 3 }, '96'), row('B', {}), row('C')]
    const splits = consolidationSplits([...rows, { ...row('A', { queued: 9 }), day: '2026-09-20' }], day)
    expect(splits.map((s) => [s.entity, s.total, s.transfer_wei])).toEqual([['Lido CM v2', 2974, 96n], ['A', 1, 32n]])
    expect(splits[0].statuses).toEqual({ queued: 2971, completed: 3 })
  })
  test('always shows completed and queued, and adds other statuses only when they occur', () => {
    const summary = { ...requests, statuses_daily: { [day]: { 'consolidation / pending': 1, 'compounding_switch / rejected': 1 } } }
    expect(consolidationStatusesIn(summary, [day])).toEqual(['completed', 'queued', 'pending'])
    expect(consolidationStatusesIn(summary, ['2026-09-20'])).toEqual(['completed', 'queued'])
    const rejected = { ...requests, statuses_daily: { [day]: { 'consolidation / rejected': 2 } } }
    expect(consolidationStatusesIn(rejected, [day])).toEqual(['completed', 'queued', 'rejected'])
  })
})

describe('cohort range models', () => {
  const cohort: CohortSummary = {
    daily: [
      { epoch: 10, timestamp: 0, counts: { '0x02': 1 }, effective_wei: {}, compound_mean_wei: '1', compound_median_wei: '1' },
      { epoch: 20, timestamp: 0, counts: { '0x02': 2 }, effective_wei: {}, compound_mean_wei: '2', compound_median_wei: '2' },
      { epoch: 30, timestamp: 0, counts: {}, effective_wei: {}, compound_mean_wei: null, compound_median_wei: null },
    ],
    latest_epoch: 20, histogram: { b: 2 }, entities: [],
    by_epoch: { '10': { histogram: { a: 1 }, entities: [{ entity: 'X', validators: 1, effective_wei: '1', compound_wei: '1' }] }, '20': { histogram: { b: 2 }, entities: [] } },
  }
  const dayOfEpoch = new Map([[10, '2026-06-10'], [20, '2026-06-11'], [30, '2026-06-12']])
  test('uses the last epoch with balance data inside the range', () => {
    const got = cohortInRange(cohort, dayOfEpoch, ['2026-06-10', '2026-06-12'])
    expect(got.daily.map((d) => d.epoch)).toEqual([10, 30])
    expect(got.latest_epoch).toBe(10)
    expect(got.histogram).toEqual({ a: 1 })
    expect(got.entities[0].entity).toBe('X')
    expect(cohortInRange(cohort, dayOfEpoch, ['2026-06-12']).latest_epoch).toBeNull()
  })
})

describe('axis continuity', () => {
  test('day distance is calendar days in UTC', () => {
    expect(dayDiff('2026-06-17', '2026-09-04')).toBe(79)
    expect(dayDiff('2026-06-10', '2026-06-11')).toBe(1)
  })
  test('a skipped stretch becomes one break with the number of missing days', () => {
    const days = ['2026-06-16', '2026-06-17', '2026-09-04', '2026-09-05']
    expect(axisBreaks(days)).toEqual([{ index: 2, missing: 78, from: '2026-06-17', to: '2026-09-04' }])
  })
  test('consecutive days have no breaks', () => {
    expect(axisBreaks(['2026-06-10', '2026-06-11', '2026-06-12'])).toEqual([])
    expect(axisBreaks([])).toEqual([])
  })
  test('adjacent not-collected days merge into one band', () => {
    const days = ['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14']
    const collected = (d: string) => d === '2026-06-10' || d === '2026-06-14'
    expect(notCollectedRuns(days, collected)).toEqual([{ start: 1, end: 3, days: 3 }])
  })
  test('a run that reaches the end of the range is closed', () => {
    expect(notCollectedRuns(['a', 'b'], () => false)).toEqual([{ start: 0, end: 1, days: 2 }])
    expect(notCollectedRuns(['a', 'b'], () => true)).toEqual([])
  })
})

describe('presets and submissions', () => {
  const day = (d: string, state: DayEntry['state']): DayEntry => ({
    day: d, state, coverage: { deposits: 0, consolidations: 0 }, gaps: 0, participants: 0, enriched_share: null,
    events: { deposits: 0, requests: 0 }, reference_epoch: 0, balances: null,
  })
  const days = [day('2026-06-10', 'complete'), day('2026-06-11', 'partial'), day('2026-06-12', 'not_collected'),
    day('2026-09-04', 'complete'), day('2026-09-05', 'complete'), day('2026-09-06', 'complete'), day('2026-09-07', 'not_collected')]
  test('presets are the last 7, 30 and 90 calendar days, ending on the newest collected day', () => {
    const got = presets(days)
    expect(got.map((p) => p.label)).toEqual(['Last 7 days', 'Last 30 days', 'Last 90 days'])
    expect(got[0].range).toEqual({ start: '2026-08-31', end: '2026-09-06' })
    expect(got[0].days).toEqual(['2026-09-04', '2026-09-05', '2026-09-06'])
    expect(presets([])).toEqual([])
  })
  test('a trailing window counts a partial today and skips uncollected days', () => {
    const many = Array.from({ length: 40 }, (_, i) => day(new Date(Date.UTC(2026, 5, 10 + i)).toISOString().slice(0, 10),
      i === 35 ? 'not_collected' : i === 39 ? 'partial' : 'complete'))
    const got = presets(many).find((p) => p.id === 'last7')
    expect(got?.range).toEqual({ start: '2026-07-13', end: '2026-07-19' })
    expect(got?.days).toEqual(['2026-07-13', '2026-07-14', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19'])
    expect(presets(many).find((p) => p.id === 'last90')?.days.length).toBe(39)
  })
  test('submission summary filters by supplied prefix', () => {
    const rows = [
      { day: '2026-06-10', entity: 'A', prefix: '0x01', wei: '32', count: 1 },
      { day: '2026-06-10', entity: 'B', prefix: '0x02', wei: '64', count: 2 },
      { day: '2026-06-11', entity: 'A', prefix: '0x01', wei: '1', count: 1 },
    ]
    const got = submissionSummary(rows, ['2026-06-10', '2026-06-11'], '0x01')
    expect(got.entities).toEqual([{ entity: 'A', wei: 33n, count: 2 }])
    expect(submissionSummary(rows, ['2026-06-10'], '').count).toBe(3)
  })
})
