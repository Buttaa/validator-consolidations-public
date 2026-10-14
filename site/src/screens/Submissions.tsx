import { useMemo, useState } from 'react'
import { EntityLink, Table } from '../components/basics'
import { RecordTable } from '../components/RecordTable'
import { eth } from '../data/eth'
import { submissionSummary } from '../data/models'
import type { Row, SubmissionRow } from '../data/schema'
import { isOther } from '../data/public'
import { shardStatus, useShardRows } from '../hooks'
import { useSelection } from '../state'
import { Panel, Tiles } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

export function SubmissionsScreen() {
  const { summary, days } = useSelection()
  const [prefix, setPrefix] = useState('0x01')
  const totals = useMemo(() => submissionSummary(summary.submissions.entity_daily, days, prefix), [summary, days, prefix])
  const named = totals.entities.filter((e) => !isOther(e.entity))
  const shards = useShardRows<SubmissionRow>('submissions')
  const records = useMemo(() => shards.rows.filter((r) => !r.removed && (!prefix || r.prefix === prefix)), [shards.rows, prefix])
  const tools = shards.requestedDays < shards.totalDays ? <button type="button" onClick={shards.loadAll}>Load all {shards.totalDays} days</button> : null
  const controls = (
    <label className="field">Supplied credential
      <select value={prefix} onChange={(e) => setPrefix(e.target.value)}>
        <option value="0x01">0x01 only</option><option value="0x02">0x02 only</option><option value="0x00">0x00 only</option><option value="">All supplied prefixes</option>
      </select>
    </label>
  )
  const overview = (
    <div className="grid">
      <Tiles items={[
        { label: `${prefix || 'All prefixes'} · submission events`, value: totals.count.toLocaleString('en-US'), small: 'sent from the execution layer in the selected days' },
        { label: 'ETH submitted', value: eth(totals.total_wei), small: 'original submission amounts', tone: 'amber' },
        { label: 'Entities', value: named.length.toLocaleString('en-US'), small: 'named in this snapshot' },
      ]} />
      <Panel title={`Submitted by entity · ${prefix || 'all prefixes'}`} note="Original submission credentials and dates, so the credential mode in the top bar does not apply here. The overview and All entries use the same prefix filter.">
        <Table headers={['Entity', { label: 'ETH submitted', num: true }, { label: 'Deposit events', num: true }]}
          rows={named.map((e) => [<EntityLink key={e.entity} name={e.entity} />, eth(e.wei), e.count.toLocaleString('en-US')])} empty="No matching submissions in the scanned histories." />
      </Panel>
    </div>
  )
  return (
    <Screen id="submissions" title="SUB · Deposits submitted during the selected days"
      description="Deposits sent from the execution layer during the selected dates. Only the histories of validators already enriched in this report were searched, so this is a partial view of submissions across Ethereum."
      chip={<span className="chip red">Partial coverage</span>}
      controls={controls}
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'All entries', body: <RecordTable kind="submissions" rows={records as unknown as Row[]} status={shardStatus(shards)} tools={tools} busy={shards.busy} /> },
      ]}
      queries={['submissions', 'metadata']} />
  )
}
