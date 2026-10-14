import type { ReactNode } from 'react'
import clsx from 'clsx'
import { eth, exactEth } from '../data/eth'
import { API_DOCS, PUBLIC_ROWS, isOther } from '../data/public'
import { ADDRESS, TX, addressOf, arkhamUrl, etherscanUrl, explorerUrl, linkKind } from '../data/links'
import { useEntityPanel } from '../terminal/EntityPanel'
import { useTooltip } from './Tooltip'

export type Header = string | { label: string; num?: boolean }

export function MoreRows({ total }: { total: number }) {
  if (total <= PUBLIC_ROWS) return null
  return (
    <p className="note more-rows">
      First {PUBLIC_ROWS} of {total.toLocaleString('en-US')} · use the <a href={API_DOCS} target="_blank" rel="noreferrer">beaconcha.in API</a> to see more
    </p>
  )
}

/** A small static table. Numeric columns right-align; wide tables scroll inside their panel. */
export function Table({ headers, rows, empty = 'No matching records.' }: { headers: Header[]; rows: ReactNode[][]; empty?: string }) {
  const cols = headers.map((h) => (typeof h === 'string' ? { label: h, num: false } : { num: false, ...h }))
  const total = rows.length
  rows = rows.slice(0, PUBLIC_ROWS)
  return (
    <>
    <div className="table-scroll">
      <table>
        <thead><tr>{cols.map((c) => <th key={c.label} scope="col" className={clsx(c.num && 'num')}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} className={clsx(cols[j]?.num && 'num')}>{cell}</td>)}</tr>
          )) : <tr><td colSpan={cols.length} className="empty">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
    <MoreRows total={total} />
    </>
  )
}

export function Bars({ items, unit = 'ETH', note }: { items: [string, number][]; unit?: string; note?: string }) {
  if (!items.length || !items.some(([, v]) => v)) return <p className="empty">No matching records.</p>
  const maximum = Math.max(...items.map(([, v]) => v)) || 1
  return (
    <div className="bars">
      {items.map(([label, value]) => <BarRow key={label} label={label} value={value} unit={unit} maximum={maximum} note={note} />)}
    </div>
  )
}

function BarRow({ label, value, unit, maximum, note }: { label: string; value: number; unit: string; maximum: number; note?: string }) {
  const tooltip = useTooltip({ title: `${label}: ${value.toLocaleString('en-US')} ${unit}`, lines: note ? [note] : undefined })
  return (
    <div className="bar-row" {...tooltip}>
      <span className="bar-name" title={label}>{label}</span>
      <span className="track"><span className="fill" style={{ width: `${(value / maximum) * 100}%` }} /></span>
      <span className="bar-value">{value.toLocaleString('en-US', { maximumFractionDigits: unit === 'ETH' ? 2 : 0 })} <small>{unit}</small></span>
    </div>
  )
}

export function CredentialBadge({ value }: { value: string }) {
  return <span className="credential" data-credential={value}>{value}</span>
}

export function Eth({ wei }: { wei: string | bigint | null | undefined }) {
  if (wei === null || wei === undefined) return <>—</>
  return <span title={exactEth(wei) + ' ETH'}>{eth(wei)}</span>
}

// --- explorer links ----------------------------------------------------------

export { entityUrl, explorerUrl } from '../data/links'

export function ExternalLink({ href, title, children }: { href: string; title?: string; children: ReactNode }) {
  // Links sit inside selectable grid rows; opening one must not also select the row.
  return <a href={href} target="_blank" rel="noopener noreferrer" title={title} onClick={(e) => e.stopPropagation()}>{children}</a>
}

/** Etherscan and Arkham for an execution address, as two compact tags beside it. */
export function AddressLinks({ address }: { address: string }) {
  return (
    <span className="addr-links">
      <ExternalLink href={etherscanUrl(address)} title={`${address} on Etherscan`}>Etherscan</ExternalLink>
      <ExternalLink href={arkhamUrl(address)} title={`${address} on Arkham`}>Arkm</ExternalLink>
    </span>
  )
}

/** An entity name opens the in-app entity panel (which carries the beaconcha.in link); it never navigates away by itself.
 *  Address-shaped labels are execution addresses, so they also get Etherscan and Arkham. */
export function EntityLink({ name }: { name: string }) {
  const panel = useEntityPanel()
  if (!name) return <>—</>
  if (isOther(name)) return <>{name}</>
  const button = <button type="button" className="entity-link" title={`Inspect ${name}`} onClick={() => panel.open(name)}>{name}</button>
  return ADDRESS.test(name) ? <span className="addr">{button}<AddressLinks address={name} /></span> : button
}

export function ExplorerLink({ kind, value, full }: { kind: string; value: string | number; full?: boolean }) {
  if (kind === 'entity') return <EntityLink name={String(value)} />
  const text = String(value)
  const label = !full && TX.test(text) ? text.slice(0, 12) + '…' : text
  return <ExternalLink href={explorerUrl(kind, value)} title={`${kind} ${value} on beaconcha.in`}>{label}</ExternalLink>
}

/** Links an identifier by column and shape when the column declares no format. */
export function Linked({ value, column, full }: { value: string; column?: string; full?: boolean }) {
  const kind = linkKind(value, column)
  if (kind === 'entity') return <EntityLink name={value} />
  if (kind === 'address' || kind === 'credential') {
    const address = addressOf(value)!
    return (
      <span className="addr">
        <ExternalLink href={explorerUrl('address', address)} title={`address ${address} on beaconcha.in`}>{value}</ExternalLink>
        <AddressLinks address={address} />
      </span>
    )
  }
  if (kind) return <ExplorerLink kind={kind} value={value} full={full} />
  return <>{value}</>
}
