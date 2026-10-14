import { useMemo, useState } from 'react'
import { DailyChart } from '../components/DailyChart'
import { Donut, type Slice } from '../components/Donut'
import { EntityMix } from '../components/EntityMix'
import { PALETTE } from '../components/StackedChart'
import { PREFIXES } from '../data/models'
import { RecordTable } from '../components/RecordTable'
import { eth, percent } from '../data/eth'
import { depositTotals, entityBreakdown, recentDepositRows, selectedDaily, type EntityRow } from '../data/models'
import { compactNumber } from '../data/eth'
import type { DepositRow, Row } from '../data/schema'
import { isOther } from '../data/public'
import { shardStatus, useShardRows } from '../hooks'
import { useSelection } from '../state'
import { useNavigation } from '../terminal/navigation'
import { Panel, Tiles } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

export function DepositsScreen() {
  const { summary, days, daySet, credited } = useSelection()
  const nav = useNavigation()
  const current = credited ? summary.deposits : summary.deposits_submitted
  const [sortField, setSortField] = useState<keyof EntityRow>('wei')
  const totals = useMemo(() => depositTotals(current, days), [current, days])
  const entities = useMemo(() => entityBreakdown(current.entity_daily, daySet, sortField), [current, daySet, sortField])
  const known = entities.filter((e) => e.entity !== 'Unknown entity').reduce((n, e) => n + BigInt(e.wei), 0n)
  const allDays = useMemo(() => selectedDaily(current.entity_daily, days), [current, days])
  const shards = useShardRows<DepositRow>('deposits')
  const records = useMemo(() => shards.rows.map((r) => ({ ...r, chart_prefix: credited ? r.credited_prefix : r.submitted_prefix })), [shards.rows, credited])
  const recent = useMemo(() => recentDepositRows(shards.rows, credited), [shards.rows, credited])
  const tools = shards.requestedDays < shards.totalDays ? <button type="button" onClick={shards.loadAll}>Load all {shards.totalDays} days</button> : null
  const mode = credited ? 'credential used when credited' : 'credential supplied with the deposit'
  const ethSlices: Slice[] = PREFIXES.map((p) => ({ label: p, value: Number(totals.by_prefix[p] || 0n) / 1e18, display: eth(totals.by_prefix[p] || 0n), color: PALETTE[p] })).filter((s) => s.value > 0)
  const eventSlices: Slice[] = PREFIXES.map((p) => ({ label: p, value: totals.counts[p] || 0, display: (totals.counts[p] || 0).toLocaleString('en-US'), color: PALETTE[p] })).filter((s) => s.value > 0)
  const byTotal = useMemo(() => (sortField === 'wei' ? entities : entityBreakdown(current.entity_daily, daySet, 'wei')), [entities, sortField, current, daySet])
  const viewDeposits = (row: Row) => nav.go('deposits', { view: 'records', table: 'deposits', search: String(row.entity), exact: { entity: String(row.entity) } })
  const overview = (
    <div className="grid">
      <Tiles items={[
        { label: 'External ETH credited', value: eth(totals.total_wei), small: `${totals.count.toLocaleString('en-US')} deposit / top-up events` },
        { label: 'ETH classified 0x01', value: eth(totals.by_prefix['0x01'] || 0n), small: `${percent(totals.by_prefix['0x01'] || 0n, totals.total_wei, 1)} of observed ETH` },
        { label: 'ETH classified 0x02', value: eth(totals.by_prefix['0x02'] || 0n), small: `${percent(totals.by_prefix['0x02'] || 0n, totals.total_wei, 1)} of observed ETH`, tone: 'amber' },
        { label: 'Labelled ETH', value: percent(known, totals.total_wei, 1), small: 'of observed ETH carries a provider entity label' },
        { label: 'Reclassified top-ups', value: totals.reclassified.toLocaleString('en-US'), small: 'switch category between the credited and supplied views' },
      ]} />
      <Panel span={4} title="Deposited ETH by credential" note={`Selected range, ${mode}. The same split as the Dune “ETH deposit distribution” donut, for any range you pick.`}>
        <Donut slices={ethSlices} unit="ETH" center={{ value: eth(totals.total_wei), label: 'ETH credited' }} />
      </Panel>
      <Panel span={4} title="Deposit events by credential" note="One event per processed deposit or top-up, not one per validator.">
        <Donut slices={eventSlices} unit="events" center={{ value: compactNumber(totals.count), label: 'events' }} />
      </Panel>
      <Panel span={4} title="Deposited ETH by entity & credential · top 5" note="Bar length = the entity’s deposited ETH, scaled to the largest shown; colors = credential type. Entity names open the entity panel; addresses also link to Etherscan and Arkham.">
        <EntityMix entities={byTotal} total={totals.total_wei} mode={credited ? 'credited' : 'supplied'} />
      </Panel>
      <Panel title="Daily ETH deposited · by credential" note={<>Basis: {mode}. Known detail gaps affect daily totals; uncollected days are shaded, never drawn as zero. Hover, focus or tap a segment for exact amounts and entity contributions.</>}>
        <DailyChart data={allDays} metric="wei" label="Daily total of ETH by credential type" />
      </Panel>
      <Panel title="Entity ranking · external ETH"
        tools={<label className="field">Sort by
          <select value={sortField} onChange={(e) => setSortField(e.target.value as keyof EntityRow)}>
            <option value="wei">All credential types · ETH</option>
            <option value="eth01_wei">0x01 ETH</option>
            <option value="eth02_wei">0x02 ETH</option>
          </select></label>}
        note="Share = this entity’s deposited ETH ÷ all observed external deposited ETH in the selected days. Unknown-credential amounts are included in totals and shown in the row detail. Entity labels are present-day attribution, not proof of who funded a transaction.">
        <RecordTable kind="entities" rows={entities.filter((e) => !isOther(e.entity)) as unknown as Row[]} action={{ label: 'View deposits', run: viewDeposits }} height={380} />
      </Panel>
    </div>
  )
  return (
    <Screen id="deposits" title="DEP · Deposits & entity ranking"
      description="Deposits processed during the selected UTC days; processing can occur weeks after execution-layer submission. External ETH credited = completed user deposits and top-ups applied to validator balances, excluding system deposits and consolidation transfers — gross inflow, not net of withdrawals."
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'All entries', body: <RecordTable kind="deposits" rows={records as unknown as Row[]} status={shardStatus(shards)} tools={tools} busy={shards.busy} /> },
        { id: 'recent', label: 'Recent', body: <RecordTable kind="recent_deposits" rows={recent as unknown as Row[]} status={shardStatus(shards)} tools={tools} busy={shards.busy} /> },
      ]}
      queries={['deposits', 'metadata', 'registry', 'switches', 'bls']} />
  )
}
