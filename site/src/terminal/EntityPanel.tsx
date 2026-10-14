// Entity inspector: a side panel with everything this dataset knows about one entity in the
// selected range, plus jumps into the record grids and an explicit beaconcha.in link.
// State lives at the top of the tree (tooltips and grids open it); the panel renders inside the Shell.
import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DailyChart } from '../components/DailyChart'
import { AddressLinks, Table } from '../components/basics'
import { ContractLabelFacts, ContractLabelNote, OperatorTable } from '../components/ContractLabels'
import { ADDRESS, arkhamUrl, entityUrl, etherscanUrl } from '../data/links'
import { eth, percent } from '../data/eth'
import { cohortInRange, entityBreakdown, requestEntities, selectedDaily, submissionSummary } from '../data/models'
import { useSelection } from '../state'
import { useNavigation } from './navigation'
import { Tiles } from './Panel'

interface Api { name: string | null; open(name: string): void; close(): void }
const Context = createContext<Api | null>(null)

export function EntityPanelProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<string | null>(null)
  const api = useMemo<Api>(() => ({ name, open: setName, close: () => setName(null) }), [name])
  return <Context.Provider value={api}>{children}</Context.Provider>
}

export function useEntityPanel(): Api {
  const value = useContext(Context)
  if (!value) throw new Error('useEntityPanel outside EntityPanelProvider')
  return value
}

export function EntityPanelHost() {
  const panel = useEntityPanel()
  useEffect(() => {
    if (!panel.name) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') panel.close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])
  return panel.name ? <EntityPanel key={panel.name} name={panel.name} onClose={panel.close} /> : null
}

function EntityPanel({ name, onClose }: { name: string; onClose(): void }) {
  const { summary, days, daySet, dayOfEpoch, credited } = useSelection()
  const nav = useNavigation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  const current = credited ? summary.deposits : summary.deposits_submitted
  const deposits = useMemo(() => entityBreakdown(current.entity_daily, daySet).find((e) => e.entity === name), [current, daySet, name])
  const requests = useMemo(() => requestEntities(summary.requests.entity_daily, days).find((e) => e.entity === name), [summary, days, name])
  const cohort = useMemo(() => cohortInRange(summary.cohort, dayOfEpoch, days), [summary, dayOfEpoch, days])
  const balance = cohort.entities.find((e) => e.entity === name)
  const check = summary.entitychecks.find((e) => e.entity === name)
  const submissions = useMemo(() => submissionSummary(summary.submissions.entity_daily, days, '').entities.find((e) => e.entity === name), [summary, days, name])
  const daily = useMemo(() => selectedDaily(current.entity_daily, days, name), [current, days, name])
  const manual = (summary.manual_labels || []).filter((m) => m.label === name).map((m) => m.address)
  const contract = (summary.module_labels || []).filter((m) => m.entity === name)
  // Manual and contract labels have no page of their own on beaconcha.in; their addresses carry the external links instead.
  const external = manual.length || contract.length ? null : entityUrl(name)
  const wei = deposits ? BigInt(deposits.wei) : 0n
  const go = (...args: Parameters<typeof nav.go>) => { onClose(); nav.go(...args) }
  const snapshotDay = cohort.latest_epoch === null ? null : dayOfEpoch.get(cohort.latest_epoch)
  return (
    <aside className="entity-panel" role="dialog" aria-modal="false" aria-labelledby="entity-title">
      <header className="panel-head">
        <h2 id="entity-title" ref={heading} tabIndex={-1}>{name}</h2>
        <div className="panel-tools">
          {ADDRESS.test(name) && <span className="chip dim">Execution address · no provider label</span>}
          {name === 'Unknown entity' && <span className="chip dim">No provider label</span>}
          {manual.length > 0 && <span className="chip amber" title="Set in entity_labels.json: beaconcha.in names these addresses without a provider label">Manual label</span>}
          {contract.length > 0 && <span className="chip amber" title="Read from a staking-module contract (module_labels.json) and applied by public key; not a beaconcha.in label">Contract label</span>}
          <button type="button" className="ghost" onClick={onClose}>Close · Esc</button>
        </div>
      </header>
      <div className="entity-body">
        {manual.length > 0 && (
          <section>
            <h3>Addresses behind this label</h3>
            <ul className="label-addresses">
              {manual.map((address) => <li key={address}><span className="addr"><span>{address}</span><AddressLinks address={address} /></span></li>)}
            </ul>
            <p className="note">beaconcha.in names this entity only by these addresses. The label comes from <code>entity_labels.json</code> in the repository and merges them everywhere in the export.</p>
          </section>
        )}
        {contract.map((m) => (
          <Fragment key={m.module}>
            <section>
              <h3>Read from the module contract</h3>
              <ContractLabelFacts label={m} />
            </section>
            <section>
              <h3>Operators behind this label</h3>
              <OperatorTable label={m} />
              <p className="note"><ContractLabelNote /></p>
            </section>
          </Fragment>
        ))}
        <Tiles items={[
          { label: 'ETH deposited', value: eth(wei), small: deposits ? `${deposits.count.toLocaleString('en-US')} events · ${deposits.share} of all deposited ETH in range` : 'no deposits in the selected days' },
          { label: '0x02 share', value: wei ? percent(BigInt(deposits!.eth02_wei), wei, 1) : '—', small: 'of this entity’s deposited ETH', tone: 'amber' },
          { label: 'Completed consolidations', value: requests ? requests.completed.toLocaleString('en-US') : '0', small: requests ? `${eth(requests.transfer_wei)} ETH transferred · ${requests.switches_completed.toLocaleString('en-US')} switches` : 'none included in the selected days' },
          { label: 'Validators in group', value: balance ? balance.validators.toLocaleString('en-US') : '—', small: balance ? `${eth(balance.effective_wei)} ETH effective${snapshotDay ? ` · ${snapshotDay}` : ''}` : 'not in the latest balance snapshot' },
        ]} />
        <section>
          <h3>Deposits by credential · {credited ? 'credited' : 'supplied'}</h3>
          {deposits ? (
            <Table headers={['Type', { label: 'ETH', num: true }, { label: 'Share', num: true }]} rows={[
              ['0x01', eth(deposits.eth01_wei), percent(BigInt(deposits.eth01_wei), wei, 1)],
              ['0x02', eth(deposits.eth02_wei), percent(BigInt(deposits.eth02_wei), wei, 1)],
              ['0x00', eth(deposits.eth00_wei), percent(BigInt(deposits.eth00_wei), wei, 1)],
              ['Unknown', eth(deposits.unknown_wei), percent(BigInt(deposits.unknown_wei), wei, 1)],
            ]} />
          ) : <p className="empty">No deposits processed for this entity in the selected days.</p>}
        </section>
        <section>
          <h3>Daily ETH deposited</h3>
          <DailyChart data={daily} metric="wei" selectedEntity={name} label={`Daily ETH deposited by ${name}`} />
        </section>
        <section>
          <h3>Consolidations & switches</h3>
          {requests ? (
            <Table headers={['Measure', { label: 'Value', num: true }]} rows={[
              ['Included consolidation + switch requests', requests.requests.toLocaleString('en-US')],
              ['Completed consolidations', requests.completed.toLocaleString('en-US')],
              ['ETH transferred by consolidations', eth(requests.transfer_wei)],
              ['Completed compounding switches', requests.switches_completed.toLocaleString('en-US')],
              ['Effective ETH before switches', requests.switch_balance_count === requests.switches_completed ? eth(requests.switch_effective_wei) : 'Incomplete balance coverage'],
            ]} />
          ) : <p className="empty">No consolidation or switch requests from this entity in the selected days.</p>}
        </section>
        <section>
          <h3>Balances · latest snapshot{snapshotDay ? ` · ${snapshotDay}` : ''}</h3>
          {balance ? (
            <Table headers={['Measure', { label: 'Value', num: true }]} rows={[
              ['Validators in the event group', balance.validators.toLocaleString('en-US')],
              ['Effective ETH', eth(balance.effective_wei)],
              ['Effective ETH on 0x02 validators', eth(balance.compound_wei)],
            ]} />
          ) : <p className="empty">Not present in the latest balance snapshot of the selected days.</p>}
        </section>
        <section>
          <h3>Network-share check</h3>
          {check ? (
            <div className="wrap-values"><Table headers={['Measure', { label: 'Value', num: true }]} rows={[
              ['Approx. standing stake', check.estimated_stake_wei ? eth(check.estimated_stake_wei) + ' ETH' : '—'],
              ['Network stake share', check.net_share === null ? '—' : (Number(check.net_share) * 100).toFixed(3) + '%'],
              ['Entity validators (directory)', check.validator_count === null ? '—' : check.validator_count.toLocaleString('en-US')],
              ['Reference epoch', check.reference_epoch === null ? '—' : String(check.reference_epoch)],
              ['V1 amount checks', check.unit_check ? `${check.unit_check.matched_v1_gwei_events}/${check.unit_check.processed_events} matched` : 'Unavailable'],
              ['Directory match', check.status],
            ]} /></div>
          ) : <p className="empty">No entity-directory check for this label.</p>}
          <p className="note">Approximate stake = net_share (24h window) × network effective stake at the reference epoch: a scale check, not an equality test.</p>
        </section>
        <section>
          <h3>Submissions · partial coverage</h3>
          {submissions ? <p className="prose">{eth(submissions.wei)} ETH in {submissions.count.toLocaleString('en-US')} execution-layer submissions during the selected days, among the scanned validators only.</p>
            : <p className="empty">No submissions among the scanned validators in the selected days.</p>}
        </section>
        <div className="actions">
          <button type="button" className="primary" onClick={() => go('deposits', { view: 'records', table: 'deposits', search: name, exact: { entity: name } })}>View deposits</button>
          <button type="button" onClick={() => go('balances', { view: 'validators', table: 'validators', search: name, exact: { entity: name } })}>Validators</button>
          <button type="button" onClick={() => go('requests', { view: 'records', table: 'requests', search: name, exact: { entity: name } })}>Consolidations</button>
          <button type="button" onClick={() => go('daily', { view: 'overview', table: 'daily-entity', search: name })}>Daily split</button>
          {ADDRESS.test(name) && <a className="btn" href={etherscanUrl(name)} target="_blank" rel="noopener noreferrer">Etherscan ↗</a>}
          {ADDRESS.test(name) && <a className="btn" href={arkhamUrl(name)} target="_blank" rel="noopener noreferrer">Arkham ↗</a>}
          {external && <a className="btn" href={external} target="_blank" rel="noopener noreferrer">{ADDRESS.test(name) ? 'beaconcha.in ↗' : 'Entity on beaconcha.in ↗'}</a>}
        </div>
      </div>
    </aside>
  )
}
