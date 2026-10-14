import { useMemo } from 'react'
import { ExplorerLink, Table } from '../components/basics'
import { LineChart } from '../components/LineChart'
import { SeriesChart } from '../components/SeriesChart'
import { RecordTable } from '../components/RecordTable'
import { eth } from '../data/eth'
import type { Row } from '../data/schema'
import { useSelection } from '../state'
import { Panel, Tiles } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

const pct = (v: unknown) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '—')

export function NetworkScreen() {
  const { summary, days, daySet, dayOfEpoch } = useSelection()
  const rows = useMemo(() => summary.network.filter((e) => daySet.has(dayOfEpoch.get(e.epoch) || '')), [summary, daySet, dayOfEpoch])
  const latest = rows[rows.length - 1]
  const byDay = useMemo(() => new Map(rows.map((e) => [dayOfEpoch.get(e.epoch) || '', e])), [rows, dayOfEpoch])
  const active = { key: 'active', label: 'Active effective ETH', color: '#9a968b', values: days.map((day) => { const e = byDay.get(day); return e ? Number(BigInt(e.total_active_balance)) / 1e18 : null }) }
  const validators = days.map((day) => byDay.get(day)?.validators_count ?? null)
  const counted = validators.filter((v): v is number => v !== null)
  const growth = counted.length > 1 ? counted[counted.length - 1] - counted[0] : 0
  const overview = (
    <div className="grid">
      <Panel title="Active effective ETH · full network · daily" note="Epoch-overview totals for the entire network at each day’s reference epoch. A split by withdrawal credential type (0x00/0x01/0x02) is not available from any endpoint we collect; it needs the full registry.">
        <SeriesChart days={days} series={[active]} unit="ETH" label="Daily full-network active effective ETH" />
      </Panel>
      <Panel title="Active validators · full network · daily"
        tools={counted.length > 1 ? <span>{growth >= 0 ? '+' : '−'}{Math.abs(growth).toLocaleString('en-US')} ({((growth / counted[0]) * 100).toFixed(2)}%) over the range</span> : undefined}
        note="The axis is fitted to the range and does not start at zero, so the day-to-day change is visible. A log scale would not help here: the count moves only a few percent.">
        <LineChart days={days} values={validators} name="Active validators" label="Daily full-network active validator count" />
      </Panel>
      {latest && <Tiles items={[
        { label: 'Active validators', value: latest.validators_count.toLocaleString('en-US'), small: `epoch ${latest.epoch} · ${dayOfEpoch.get(latest.epoch) || ''}` },
        { label: 'Active effective ETH', value: eth(latest.total_active_balance), small: 'full network, not the event cohort', tone: 'amber' },
        { label: 'Participation', value: pct(latest.participation_rate), small: 'attestation participation rate' },
        { label: 'Finality', value: String(latest.finality).toUpperCase(), small: 'epoch state as saved', tone: latest.finality === 'finalized' ? 'green' : 'red' },
      ]} />}
      <Panel title="Reference epochs in range" note="Independent epoch-overview totals for the entire network, one reference epoch per selected UTC day.">
        <Table headers={['Reference epoch', 'Day', { label: 'Active validators', num: true }, { label: 'Active effective ETH', num: true }, { label: 'Participation', num: true }, 'Finality']}
          rows={rows.map((e) => [<ExplorerLink key={e.epoch} kind="epoch" value={e.epoch} />, dayOfEpoch.get(e.epoch) || '', e.validators_count.toLocaleString('en-US'), eth(e.total_active_balance), pct(e.participation_rate), String(e.finality)])} />
      </Panel>
    </div>
  )
  return (
    <Screen id="network" title="NET · Full-network reference totals"
      description="Independent epoch-overview totals for the entire network, unlike the event cohort on BAL."
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'All entries', body: <RecordTable kind="network" rows={rows as unknown as Row[]} /> },
      ]}
      queries={['network']} />
  )
}
