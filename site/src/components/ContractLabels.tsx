// Contract labels in the UI: what one module label is based on, and its operators (module_labels.json).
import type { ReactNode } from 'react'
import { activeOperators, creditText, providerStatus } from '../data/moduleLabels'
import type { ModuleLabel } from '../data/schema'
import { AddressLinks, EntityLink, Table } from './basics'

const n = (value: number) => value.toLocaleString('en-US')
const utc = (iso: string | null) => (iso ? `${iso.replace('T', ' ').slice(0, 16)} UTC` : 'time unknown')

function Address({ value }: { value: string }) {
  return <span className="addr"><span>{value}</span><AddressLinks address={value} /></span>
}

export function ContractLabelFacts({ label, entityLink = false }: { label: ModuleLabel; entityLink?: boolean }) {
  const status = providerStatus(label)
  const rows: ReactNode[][] = [
    ...(entityLink ? [['Entity', <EntityLink name={label.entity} />]] : []),
    ['Module contract', <><Address value={label.module} />{label.type && <span className="dim"> · {label.type}</span>}</>],
    ...(label.names ? [['Operator names', <Address value={label.names} />]] : []),
    ['Keys read', <>{n(label.deposited_keys)} deposited keys · {n(label.operators_count)} operators · block {n(label.block)} · {utc(label.block_time)}{label.stale && <> <span className="chip red">Read before the window end</span></>}</>],
    ['In the exported data', `${n(label.validators)} module validators · ${n(label.labelled)} labelled`],
    ['beaconcha.in label', <>{status.text}{status.named && <> <span className="chip amber" title="Compare its name with this label, then keep, demote or delete the module entry">Named by beaconcha.in</span></>}</>],
    ['Precedence', label.precedence === 'contract' ? 'contract · replaces beaconcha.in’s label' : 'provider · beaconcha.in’s entity names win'],
    ['Consolidations', creditText(label)],
  ]
  return <div className="contract-facts"><Table headers={['Measure', 'Value']} rows={rows} /></div>
}

export function OperatorTable({ label }: { label: ModuleLabel }) {
  const operators = activeOperators(label)
  const idle = label.operators.length - operators.length
  return (
    <>
      <div className="operator-table">
        <Table headers={['Operator', { label: 'ID', num: true }, { label: 'Validators in data', num: true }, { label: 'Deposited keys', num: true }]}
          rows={operators.map((o) => [o.name, String(o.id), n(o.validators), n(o.deposited_keys)])} empty="No operator has deposited keys yet." />
      </div>
      {idle > 0 && <p className="note">{n(idle)} {idle === 1 ? 'operator has' : 'operators have'} no deposited keys at this block.</p>}
    </>
  )
}

/** How the label is made and how to retire it; inline content for a note paragraph. */
export function ContractLabelNote() {
  return <>Read from the contract, not from beaconcha.in: <code>module_labels.py</code> stores each operator’s deposited keys in <code>module_keys.json</code>, and the export applies them by public key. Once beaconcha.in labels the module, set <code>precedence</code> to <code>provider</code> in <code>module_labels.json</code> (its names win) or delete the entry, then re-export.</>
}
