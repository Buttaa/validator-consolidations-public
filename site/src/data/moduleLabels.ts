// Contract labels: validators named from a staking-module contract (module_labels.json) until beaconcha.in labels them.
import type { ModuleLabel, ModuleOperator } from './schema'

const n = (value: number) => value.toLocaleString('en-US')

export interface ProviderStatus { text: string; named: boolean }

/** What beaconcha.in itself calls the module's validators. Once it names them, decide whether its name should replace the contract label. */
export function providerStatus(label: ModuleLabel): ProviderStatus {
  if (!label.validators) return { text: 'No validator of this module is in the exported data yet, so there is no beaconcha.in label to compare.', named: false }
  const named = Object.entries(label.provider_named).sort((a, b) => b[1] - a[1])
  const namedCount = named.reduce((sum, [, count]) => sum + count, 0)
  const addressed = Object.entries(label.provider_address).sort((a, b) => b[1] - a[1])
  const addressCount = addressed.reduce((sum, [, count]) => sum + count, 0)
  const parts: string[] = []
  if (namedCount) parts.push(`names ${n(namedCount)} of ${n(label.validators)}: ${named.slice(0, 3).map(([name, count]) => `${name} (${n(count)})`).join(', ')}${named.length > 3 ? ', …' : ''}`)
  if (addressCount) parts.push(`shows ${n(addressCount)} only under ${addressed.length === 1 ? 'the address' : 'addresses such as'} ${addressed[0][0]}`)
  if (label.provider_none) parts.push(`has no label for ${n(label.provider_none)}`)
  return { text: `beaconcha.in ${parts.join('; ')}.`, named: namedCount > 0 }
}

/** Operators with deposited keys or validators in the data, most validators first. */
export function activeOperators(label: ModuleLabel): ModuleOperator[] {
  return label.operators.filter((o) => o.deposited_keys > 0 || o.validators > 0)
    .sort((a, b) => b.validators - a.validators || b.deposited_keys - a.deposited_keys || a.id - b.id)
}

/** How consolidations into the module's validators are attributed, with the credit taken from other entities. */
export function creditText(label: ModuleLabel): string {
  if (label.consolidation_credit !== 'target') return 'Count under the source validator’s entity, as elsewhere.'
  const from = Object.entries(label.credited_from || {}).sort((a, b) => b[1] - a[1])
  const count = from.reduce((sum, [, c]) => sum + c, 0)
  const detail = count ? `${n(count)} in the data came from other entities: ${from.slice(0, 3).map(([name, c]) => `${name} (${n(c)})`).join(', ')}${from.length > 3 ? ', …' : ''}` : 'none in the data came from other entities'
  return `Consolidations into its validators count under ${label.entity}, not the source’s entity; ${detail}.`
}

/** Entities that take the credit for consolidations into their validators. */
export function creditingEntities(labels: ModuleLabel[] | undefined): string[] {
  return (labels || []).filter((m) => m.consolidation_credit === 'target').map((m) => m.entity)
}
