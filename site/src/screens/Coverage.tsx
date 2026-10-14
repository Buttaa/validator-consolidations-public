import { useMemo } from 'react'
import { RecordTable } from '../components/RecordTable'
import { DATA_BASE } from '../data/load'
import type { Row } from '../data/schema'
import { useSelection } from '../state'
import { useCoverage } from '../terminal/coverage'
import { Panel, Tiles } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'

const mb = (bytes: number) => (bytes / 1e6).toFixed(bytes < 1e5 ? 2 : 1) + ' MB'

export function CoverageScreen() {
  const { summary, days, dayEntries } = useSelection()
  const cov = useCoverage()
  const access = summary.validation.api_access?.results.filter((r) => 'success' in r) || []
  const passed = access.filter((r) => r.success).length
  const attempts = Object.values(summary.call_counts).reduce((n, c) => n + c, 0)
  const dayRows = useMemo(() => days.map((day) => {
    const e = dayEntries.get(day)
    return e ? {
      day, state: e.state, deposit_slots: `${e.coverage.deposits.toLocaleString('en-US')} / ${summary.slots_per_day.toLocaleString('en-US')}`,
      request_slots: `${e.coverage.consolidations.toLocaleString('en-US')} / ${summary.slots_per_day.toLocaleString('en-US')}`, gaps: e.gaps,
      deposits: e.events.deposits, requests: e.events.requests, participants: e.participants,
      enriched: e.enriched_share === null ? '—' : (e.enriched_share * 100).toFixed(1) + '%',
      balances: e.balances === 'all' ? 'Every validator' : e.balances === '0x02' ? '0x02 validators' : 'None yet', reference_epoch: e.reference_epoch,
    } : { day, state: 'not_collected' }
  }), [days, dayEntries, summary])
  const groups = new Map<string, { files: number; bytes: number; rows: number }>()
  for (const f of summary.files) {
    const dir = f.path.split('/')[0]
    const g = groups.get(dir) || { files: 0, bytes: 0, rows: 0 }
    g.files += 1; g.bytes += f.bytes; g.rows += f.rows
    groups.set(dir, g)
  }
  const selectedGaps = summary.coverage_rows
  const overview = (
    <div className="grid">
      <Tiles items={[
        { label: 'Days complete', value: `${cov.complete}/${cov.selected}`, small: `${cov.partial} partial · ${cov.notCollected} not collected`, tone: cov.incomplete ? 'red' : 'green' },
        { label: 'Deposit-detail slots', value: `${cov.deposits.toLocaleString('en-US')}`, small: `of ${cov.expected.toLocaleString('en-US')} slots in the selected days` },
        { label: 'Request-detail slots', value: `${cov.consolidations.toLocaleString('en-US')}`, small: `of ${cov.expected.toLocaleString('en-US')} slots in the selected days` },
        { label: 'Unresolved gaps', value: cov.gaps.toLocaleString('en-US'), small: 'slot details that failed repeatedly; never substituted with zero', tone: cov.gaps ? 'red' : 'green' },
        { label: 'Enriched validators', value: cov.participants ? `${((cov.enriched / cov.participants) * 100).toFixed(1)}%` : '—', small: `${cov.enriched.toLocaleString('en-US')} of ${cov.participants.toLocaleString('en-US')} involved validators labelled` },
        { label: 'API checks passed', value: access.length ? `${passed}/${access.length}` : '—', small: `${attempts.toLocaleString('en-US')} logged attempts incl. retries` },
      ]} />
      <Panel title="How to read this" flush>
        <div className="prose" style={{ padding: 8 }}>
          <p>{cov.preview ? <b className="red">INCOMPLETE PREVIEW. </b> : <b className="green">Every selected day is complete. </b>}Totals describe observed records; missing details are not treated as zero. {cov.gaps ? `${cov.gaps} slot-detail gaps remain in the selected days: their overview counts may include system events and are excluded from external totals; see Gaps.` : 'No unresolved slot-detail gaps in the selected days.'}{cov.unlabelled > 0 ? ` Entity labels, credential history and balances are missing for ${cov.unlabelled.toLocaleString('en-US')} of ${cov.participants.toLocaleString('en-US')} involved validators; their deposits show as “Unknown entity” until enrichment runs.` : ''}</p>
          <p>Provider entity labels are present-day attribution, not proof of who funded a transaction or of historical ownership. Each configured API key is capped below five requests per second; charts reuse saved data and make no API calls.</p>
        </div>
      </Panel>
      <Panel title="Selected days" note="Per-day state, slot coverage, event counts, enrichment share and the balance detail exported for that day.">
        <RecordTable kind="days" rows={dayRows as unknown as Row[]} action={null} height={380} />
      </Panel>
      <Panel title="Download data" note={`Exported ${new Date(summary.exported_at * 1000).toISOString().replace('T', ' ').slice(0, 19)} UTC from the collection database. Amounts are integer wei strings.`}>
        <div className="downloads">
          <a href={DATA_BASE + 'summary.json'} download>summary.json</a>
          {[...groups].map(([dir, g]) => <span key={dir} className="download-group">{dir}/ · {g.files} files · {g.rows.toLocaleString('en-US')} rows · {mb(g.bytes)}</span>)}
        </div>
        <details style={{ marginTop: 8 }}>
          <summary>Every exported file ({summary.files.length})</summary>
          <div className="downloads" style={{ marginTop: 6 }}>{summary.files.map((f) => <a key={f.path} href={DATA_BASE + f.path} download>{f.path} · {f.rows.toLocaleString('en-US')} rows</a>)}</div>
        </details>
      </Panel>
    </div>
  )
  return (
    <Screen id="coverage" title="COV · Coverage & verification"
      description="Missing detail responses remain visible and retryable. Coverage applies to the selected days."
      chip={cov.gaps ? <span className="chip red">{cov.gaps} gaps</span> : <span className="chip green">No gaps</span>}
      views={[
        { id: 'overview', label: 'Overview', body: overview },
        { id: 'records', label: 'Gaps', body: <RecordTable kind="coverage" rows={selectedGaps as unknown as Row[]} /> },
      ]}
      queries={['coverage', 'deposits', 'requests']} />
  )
}
