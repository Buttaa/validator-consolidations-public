import { useMemo } from 'react'
import { EntityLink } from '../components/basics'
import { ContractLabelFacts, ContractLabelNote } from '../components/ContractLabels'
import { RecordTable } from '../components/RecordTable'
import { eth } from '../data/eth'
import { entityBreakdown } from '../data/models'
import type { Row } from '../data/schema'
import { useSelection } from '../state'
import { Panel, Tiles } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

export function EntityChecksScreen() {
  const { summary, daySet, credited } = useSelection()
  const current = credited ? summary.deposits : summary.deposits_submitted
  const flows = useMemo(() => new Map(entityBreakdown(current.entity_daily, daySet).map((e) => [e.entity, e])), [current, daySet])
  const rows = useMemo(() => summary.entitychecks.map((r) => ({
    ...r, flow_wei: flows.get(r.entity)?.wei || '0',
    net_share_percent: r.net_share === null ? '—' : (Number(r.net_share) * 100).toFixed(3) + '%',
    units: r.unit_check ? `${r.unit_check.matched_v1_gwei_events}/${r.unit_check.processed_events} matched` : 'Unavailable',
  })), [summary, flows])
  const checks = summary.validation.entity_crosscheck
  const matched = (checks?.unit_checks || []).reduce((n, c) => n + c.matched_v1_gwei_events, 0)
  const processed = (checks?.unit_checks || []).reduce((n, c) => n + c.processed_events, 0)
  const directory = rows.filter((r) => r.estimated_stake_wei).length
  const stakewise = rows.find((e) => e.entity === 'StakeWise')
  const modules = summary.module_labels || []
  const overview = (
    <div className="grid">
      <Tiles items={[
        { label: 'Entities in report', value: rows.length.toLocaleString('en-US'), small: 'with deposits in the selected days' },
        { label: 'Directory matches', value: directory.toLocaleString('en-US'), small: 'have an approximate standing-stake estimate' },
        { label: 'V1 amount checks', value: processed ? `${matched.toLocaleString('en-US')}/${processed.toLocaleString('en-US')}` : '—', small: 'processed events matched execution-deposit histories (gwei → wei)', tone: processed && matched === processed ? 'green' : undefined },
        { label: 'Reference epoch', value: checks?.reference_epoch != null ? String(checks.reference_epoch) : '—', small: 'entity net_share × network effective stake' },
      ]} />
      <Panel title="Scale check" note="Approximate stake = entity net_share (24h evaluation window) × full-network effective stake at the reference epoch. Event flows and standing stake have different time bases: this is a scale check, not an equality test. Unmatched labels stay explicit in All entries.">
        {!checks ? <p className="prose">Entity-scale verification has not been collected for this cache. No standing-stake estimate has been substituted.</p>
          : stakewise?.estimated_stake_wei ? (
            <p className="prose"><b><EntityLink name="StakeWise" /> example:</b> {eth(flows.get('StakeWise')?.eth02_wei || '0')} ETH of 0x02 deposits and {eth(stakewise.flow_wei)} ETH of all deposits processed during the selected days, versus approximately {eth(stakewise.estimated_stake_wei)} ETH of standing stake. Network share {(Number(stakewise.net_share || 0) * 100).toFixed(3)}%.</p>
          ) : <p className="prose">All entries shows the available entity matches, unit checks and approximate standing-stake benchmarks. Missing directory matches remain explicit.</p>}
      </Panel>
      {modules.length > 0 && (
        <Panel title="Contract labels · validators named from staking-module contracts" note={<ContractLabelNote />}>
          {modules.map((m) => <ContractLabelFacts key={m.module} label={m} entityLink />)}
        </Panel>
      )}
    </div>
  )
  return (
    <Screen id="entitychecks" title="ENT · Entity totals checked against network share"
      description="Compares the size of the reported deposit flows with an independent entity-overview query."
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'All entries', body: <RecordTable kind="entitychecks" rows={rows as unknown as Row[]} /> },
      ]}
      queries={['entities', 'entity_network', 'deposits', 'submissions']} />
  )
}
