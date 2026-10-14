import { useMemo, useState } from 'react'
import { Bars, Table } from '../components/basics'
import { LineChart } from '../components/LineChart'
import { SeriesChart } from '../components/SeriesChart'
import { PALETTE } from '../components/StackedChart'
import { RecordTable } from '../components/RecordTable'
import { eth } from '../data/eth'
import { expandBalances, useMany } from '../data/load'
import { cohortInRange } from '../data/models'
import type { BalanceShard, Row, ValidatorRow } from '../data/schema'
import { useSelection } from '../state'
import { Panel, Tiles } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

export function BalancesScreen() {
  const { summary, days, dayEntries, dayOfEpoch } = useSelection()
  const cohort = useMemo(() => cohortInRange(summary.cohort, dayOfEpoch, days), [summary, dayOfEpoch, days])
  const snapshotDay = cohort.latest_epoch === null ? null : dayOfEpoch.get(cohort.latest_epoch) || null
  const withDetail = days.filter((d) => dayEntries.get(d)?.balances)
  const latest = cohort.daily[cohort.daily.length - 1]
  const rows = cohort.daily.map((d) => [
    new Date(d.timestamp * 1000).toISOString().slice(5, 16).replace('T', ' '),
    Object.values(d.counts).reduce((n, c) => n + c, 0).toLocaleString('en-US'),
    (d.counts['0x02'] || 0).toLocaleString('en-US'),
    d.compound_mean_wei ? eth(d.compound_mean_wei) : '—',
    d.compound_median_wei ? eth(d.compound_median_wei) : '—',
  ])
  const byDay = useMemo(() => new Map(cohort.daily.map((d) => [dayOfEpoch.get(d.epoch) || '', d])), [cohort, dayOfEpoch])
  const series = (['0x01', '0x02', '0x00'] as const).map((p) => ({
    key: p, label: `${p} effective ETH`, color: PALETTE[p],
    values: days.map((day) => { const d = byDay.get(day); return d ? Number(BigInt(d.effective_wei[p] || '0')) / 1e18 : null }),
  }))
  const activeInGroup = days.map((day) => { const d = byDay.get(day); return d ? Object.values(d.counts).reduce((n, c) => n + c, 0) : null })
  const overview = (
    <div className="grid">
      <Panel title="Effective ETH by credential · event cohort · daily"
        tools={<span className="chip red">Cohort only · not the network</span>}
        note="Only the validators behind the downloaded activity (deposit recipients, consolidation sources/targets, switchers), at each day’s closing reference epoch. This group is skewed towards 0x02; the network-wide split by credential type is not in this dataset — it needs the full validator registry, which was not collected.">
        <SeriesChart days={days} series={series} unit="ETH" label="Daily effective ETH of the event cohort by credential type" />
      </Panel>
      <Panel title="Active validators in the group · daily" note="The same cohort, counted at each reference epoch. The axis is fitted to the range rather than starting at zero.">
        <LineChart days={days} values={activeInGroup} name="Active validators in group" label="Daily active validators in the event cohort" />
      </Panel>
      {latest && <Tiles items={[
        { label: 'Active in group · latest', value: Object.values(latest.counts).reduce((n, c) => n + c, 0).toLocaleString('en-US'), small: `snapshot epoch ${latest.epoch}${snapshotDay ? ` · ${snapshotDay}` : ''}` },
        { label: '0x02 validators', value: (latest.counts['0x02'] || 0).toLocaleString('en-US'), small: 'compounding credentials at the snapshot', tone: 'amber' },
        { label: '0x02 mean effective', value: latest.compound_mean_wei ? eth(latest.compound_mean_wei) : '—', small: 'ETH per compounding validator' },
        { label: '0x02 median effective', value: latest.compound_median_wei ? eth(latest.compound_median_wei) : '—', small: 'ETH per compounding validator' },
      ]} />}
      <Panel span={5} title={`0x02 effective balances${snapshotDay ? ` · ${snapshotDay}` : ''}`} note="Validators in the downloaded activity, at the latest selected snapshot.">
        <Bars items={Object.entries(cohort.histogram)} unit="validators" note="Active validators from the downloaded activity, at the selected snapshot." />
      </Panel>
      <Panel span={7} title="Daily 0x02 mean and median" note="Only validators active at that snapshot contribute. Reference epochs fall immediately before each closing UTC boundary. Historical switches are reversed. Independent of the credential mode.">
        <Table headers={['UTC snapshot', { label: 'Active in group', num: true }, { label: '0x02', num: true }, { label: 'Mean ETH', num: true }, { label: 'Median ETH', num: true }]}
          rows={rows} empty="No balance snapshots in the selected days yet." />
      </Panel>
    </div>
  )
  return (
    <Screen id="balances" title="BAL · Balances of the validators behind this activity"
      description={`Balance histories were downloaded for ${summary.registry_count.toLocaleString('en-US')} validators because they received one of the deposits or took part in a listed consolidation or switch. This is that selected group only, not the average Ethereum validator. Validators shows why each one is included.`}
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'Snapshot', body: <BalanceRecords days={withDetail} defaultDay={snapshotDay} /> },
        { id: 'validators', label: 'Validators', body: <ValidatorList /> },
      ]}
      queries={['balances', 'registry', 'metadata', 'switches', 'bls', 'balance_check']} />
  )
}

function BalanceRecords({ days, defaultDay }: { days: string[]; defaultDay: string | null }) {
  const { dayEntries } = useSelection()
  const [chosen, setChosen] = useState<string | null>(null)
  const day = chosen && days.includes(chosen) ? chosen : defaultDay && days.includes(defaultDay) ? defaultDay : days[days.length - 1] || null
  const loaded = useMany<BalanceShard>(day ? [`balances/${day}.json`] : [])
  const shard = day ? loaded.data.get(`balances/${day}.json`) : undefined
  const rows = useMemo(() => (shard ? expandBalances(shard) : []), [shard])
  if (!days.length) return <p className="empty">No balance snapshots are available for the selected days yet. Enrichment runs after the slot scan.</p>
  const scope = day ? dayEntries.get(day)?.balances : null
  const picker = (
    <label className="field">Snapshot day
      <select value={day || ''} onChange={(e) => setChosen(e.target.value)}>
        {days.map((d) => <option key={d} value={d}>{d} · {dayEntries.get(d)?.balances === 'all' ? 'every validator' : '0x02 only'}</option>)}
      </select>
    </label>
  )
  const status = loaded.loading ? 'Loading snapshot…' : scope === 'all'
    ? 'Full per-validator detail for the latest snapshot; earlier days list 0x02 validators only.'
    : 'This day lists 0x02 (compounding) validators only; the daily mean/median counts every active validator.'
  return <RecordTable kind="balances" rows={rows as unknown as Row[]} status={status} tools={picker} busy={loaded.loading > 0} />
}

function ValidatorList() {
  const { summary } = useSelection()
  const paths = summary.files.filter((f) => f.path.startsWith('validators/')).map((f) => f.path)
  const loaded = useMany<ValidatorRow[]>(paths)
  const rows = useMemo(() => paths.flatMap((p) => loaded.data.get(p) || []), [paths.join('|'), loaded.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const status = `${rows.length.toLocaleString('en-US')} enriched validators${loaded.loading ? ` · loading ${loaded.loading} file(s)…` : ''}. Validators from days without enrichment are not listed.`
  return <RecordTable kind="validators" rows={rows as unknown as Row[]} status={status} busy={loaded.loading > 0} />
}
