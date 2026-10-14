import { useEffect, useMemo, useState } from 'react'
import { DailyChart } from '../components/DailyChart'
import { RecordTable } from '../components/RecordTable'
import { byEntityName } from '../data/links'
import { entityBreakdown, selectedDaily } from '../data/models'
import type { Row } from '../data/schema'
import { isOther } from '../data/public'
import { useSelection } from '../state'
import { useNavigation } from '../terminal/navigation'
import { Panel } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

export function DailyScreen() {
  const { summary, days, daySet, credited } = useSelection()
  const nav = useNavigation()
  const current = credited ? summary.deposits : summary.deposits_submitted
  const preset = nav.focus?.screen === 'daily' && nav.focus.table === 'daily-entity' ? nav.focus.search || '' : ''
  const [entity, setEntity] = useState(preset)
  useEffect(() => { if (preset) setEntity(preset) }, [preset, nav.focus?.token])
  const [shareMetric, setShareMetric] = useState<'wei' | 'count'>('wei')
  const names = useMemo(() => byEntityName(entityBreakdown(current.entity_daily, daySet).map((e) => e.entity).filter((e) => !isOther(e))), [current, daySet])
  const allDays = useMemo(() => selectedDaily(current.entity_daily, days), [current, days])
  const selected = useMemo(() => selectedDaily(current.entity_daily, days, entity), [current, days, entity])
  const records = useMemo(() => current.entity_daily.filter((r) => daySet.has(r.day) && (!entity || r.entity === entity)).map((r) => ({
    ...r,
    entity_eth_share: ((Number(r.wei) / Math.max(1, Number(allDays[r.day][r.prefix]?.wei || 0n))) * 100).toFixed(2) + '%',
    entity_count_share: ((r.count / Math.max(1, allDays[r.day][r.prefix]?.count || 0)) * 100).toFixed(2) + '%',
  })), [current, daySet, entity, allDays])
  const basis = (credited ? 'Basis: recipient credentials at processing.' : 'Basis: prefixes supplied with deposits.') + ' Known detail gaps affect daily totals.'
  const controls = (
    <>
      <label className="field">Entity
        <select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="field">100% chart shows
        <select value={shareMetric} onChange={(e) => setShareMetric(e.target.value as 'wei' | 'count')}>
          <option value="wei">Share of deposited ETH</option>
          <option value="count">Share of deposit events</option>
        </select>
      </label>
    </>
  )
  const overview = (
    <div className="grid">
      <Panel title={`Daily credential distribution · ${entity || 'all entities'}`} note="Each day totals 100% of observed ETH or events. A deposit is one event, not one unique validator. Segment tooltips show the amount, count and entity contribution.">
        <DailyChart data={selected} metric={shareMetric} normalized selectedEntity={entity} label="Daily percentage by credential type" />
      </Panel>
      <Panel span={6} title={`Deposit events per day · ${entity || 'all entities'}`}>
        <DailyChart data={selected} metric="count" selectedEntity={entity} label="Daily deposit events by credential type" />
      </Panel>
      <Panel span={6} title={`ETH deposited per day · ${entity || 'all entities'}`} note={basis}>
        <DailyChart data={selected} metric="wei" selectedEntity={entity} label="Daily ETH by credential type" />
      </Panel>
    </div>
  )
  return (
    <Screen id="daily" title="DLY · Daily deposits by entity & credential"
      description="Daily volume, event counts and the credential distribution for every entity. All entries lists each entity/day/type total with a jump to the contributing deposits."
      controls={controls}
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'All entries', body: <RecordTable kind="daily" rows={records as unknown as Row[]} action={{ label: 'View contributing deposits', run: (row) =>
          nav.go('deposits', { view: 'records', table: 'deposits', search: `${row.entity} ${row.day}`, exact: { entity: String(row.entity), day: String(row.day), chart_prefix: String(row.prefix) } }) }} /> },
      ]}
      queries={['deposits', 'metadata', 'registry', 'switches', 'bls']} />
  )
}
