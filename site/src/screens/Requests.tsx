import { useMemo } from 'react'
import { EntityLink, Table } from '../components/basics'
import { ConsolidationChart } from '../components/ConsolidationChart'
import { RecordTable } from '../components/RecordTable'
import { eth } from '../data/eth'
import { recentConsolidationRows, requestEntities, requestTotals } from '../data/models'
import { creditingEntities } from '../data/moduleLabels'
import type { RequestRow, Row } from '../data/schema'
import { isOther } from '../data/public'
import { shardStatus, useShardRows } from '../hooks'
import { useSelection } from '../state'
import { Panel, Tiles } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

export function RequestsScreen() {
  const { summary, days } = useSelection()
  const totals = useMemo(() => requestTotals(summary.requests, days), [summary, days])
  const entities = useMemo(() => requestEntities(summary.requests.entity_daily, days), [summary, days])
  const shards = useShardRows<RequestRow>('requests')
  const records = useMemo(() => shards.rows.map((r) => ({
    ...r, activity_amount: r.type === 'compounding_switch' ? eth(r.switch_effective_wei) + ' ETH effective before switch'
      // A queued or rejected request has moved nothing yet; say so rather than "Unavailable ETH transferred".
      : r.wei == null ? `No ETH moved yet · ${r.status}` : eth(r.wei) + ' ETH transferred',
  })), [shards.rows])
  const recent = useMemo(() => recentConsolidationRows(shards.rows), [shards.rows])
  const crediting = creditingEntities(summary.module_labels)
  const tools = shards.requestedDays < shards.totalDays ? <button type="button" onClick={shards.loadAll}>Load all {shards.totalDays} days</button> : null
  const overview = (
    <div className="grid">
      <Tiles items={[
        { label: 'Completed consolidations', value: totals.completed.toLocaleString('en-US'), small: `of ${totals.consolidations.toLocaleString('en-US')} included consolidation requests` },
        { label: 'Completed compounding switches', value: totals.switches_completed.toLocaleString('en-US'), small: `of ${totals.switches.toLocaleString('en-US')} included self-switch requests` },
        { label: 'ETH transferred by consolidations', value: eth(totals.transfer_wei), small: 'settled from this inclusion cohort, as last observed', tone: 'amber' },
      ]} />
      <Panel title="Daily consolidation requests · by status" note={<>Cross-validator consolidation requests by the UTC day they were included, colored by their latest observed status; compounding switches are not counted. Hover, focus or tap a day for each entity’s requests that day{crediting.length ? <>. Consolidations into {crediting.join(', ')} validators count under {crediting.length === 1 ? 'that label' : 'those labels'}</> : null}. Uncollected days are shaded, never drawn as zero.</>}>
        <ConsolidationChart requests={summary.requests} />
      </Panel>
      <Panel span={6} title="Who completed consolidations" note={<>Each completed cross-validator transfer retires a source into its target and counts under the source validator’s entity{crediting.length ? <>, except consolidations into {crediting.join(', ')} validators, which count under {crediting.length === 1 ? 'that label' : 'those labels'} (a contract-label rule)</> : null}. All entries shows the source and target entities, both validators and the processed slot.</>}>
        <Table headers={['Entity', { label: 'Completed', num: true }, { label: 'ETH transferred', num: true }]}
          rows={entities.filter((e) => e.completed && !isOther(e.entity)).map((e) => [<EntityLink key={e.entity} name={e.entity} />, e.completed.toLocaleString('en-US'), eth(e.transfer_wei)])} />
      </Panel>
      <Panel span={6} title="Who switched to compounding" note="A self-switch changes one validator from 0x01 to 0x02. Effective ETH is measured at the start of the switch epoch, at most 6.4 minutes earlier; it is not a transfer amount.">
        <Table headers={['Entity', { label: 'Completed switches', num: true }, { label: 'Effective ETH before switch', num: true }]}
          rows={entities.filter((e) => e.switches_completed && !isOther(e.entity)).map((e) => [<EntityLink key={e.entity} name={e.entity} />, e.switches_completed.toLocaleString('en-US'),
            e.switch_balance_count === e.switches_completed ? eth(e.switch_effective_wei) : 'Incomplete balance coverage'])} />
      </Panel>
    </div>
  )
  return (
    <Screen id="requests" title="CON · Consolidations & compounding switches"
      description="Requests included during the selected days, with their latest observed outcomes. Settlement can fall outside the range; earlier requests that settled here are outside this cohort. Recent = completed cross-validator transfers, newest first."
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'All entries', body: <RecordTable kind="requests" rows={records as unknown as Row[]} status={shardStatus(shards)} tools={tools} busy={shards.busy} /> },
        { id: 'recent', label: 'Recent transfers', body: <RecordTable kind="recent_consolidations" rows={recent as unknown as Row[]} status={shardStatus(shards)} tools={tools} busy={shards.busy} /> },
      ]}
      queries={['requests', 'metadata', 'balances']} />
  )
}
