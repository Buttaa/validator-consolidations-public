import { describe, expect, test } from 'vitest'
import { activeOperators, creditText, creditingEntities, providerStatus } from './moduleLabels'
import type { ModuleLabel } from './schema'

const vault = '0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f'
const base: ModuleLabel = {
  entity: 'Lido CM v2', module: '0xDa5F930cE326EB5205085D66c72A4E79d60cB8C1', names: null, type: 'curated-onchain-v2', precedence: 'contract',
  note: null, block: 1, block_time: null, operators_count: 3, deposited_keys: 5, validators: 0, labelled: 0,
  provider_named: {}, provider_address: {}, provider_none: 0, stale: false, consolidation_credit: 'target', credited_from: {},
  operators: [{ id: 0, name: 'A', deposited_keys: 2, validators: 0 }, { id: 1, name: 'B', deposited_keys: 0, validators: 0 }, { id: 2, name: 'C', deposited_keys: 3, validators: 2 }],
}

describe('contract labels', () => {
  test('without module validators in the data there is nothing to compare', () => {
    expect(providerStatus(base).named).toBe(false)
    expect(providerStatus(base).text).toContain('No validator of this module')
  })
  test('an address-only beaconcha.in label leaves the contract label in charge', () => {
    const status = providerStatus({ ...base, validators: 220, labelled: 220, provider_address: { [vault]: 220 } })
    expect(status).toEqual({ text: `beaconcha.in shows 220 only under the address ${vault}.`, named: false })
  })
  test('once beaconcha.in names the validators, the status says which names it uses', () => {
    const status = providerStatus({ ...base, validators: 300, provider_named: { 'Lido CM': 250 }, provider_address: { [vault]: 40 }, provider_none: 10 })
    expect(status).toEqual({ text: `beaconcha.in names 250 of 300: Lido CM (250); shows 40 only under the address ${vault}; has no label for 10.`, named: true })
  })
  test('operators without keys drop out and the rest rank by validators in the data', () => {
    expect(activeOperators(base).map((o) => o.name)).toEqual(['C', 'A'])
  })
  test('consolidation credit says where migrations count and where they came from', () => {
    expect(creditText({ ...base, credited_from: { Lido: 3 } })).toBe('Consolidations into its validators count under Lido CM v2, not the source’s entity; 3 in the data came from other entities: Lido (3).')
    expect(creditText(base)).toBe('Consolidations into its validators count under Lido CM v2, not the source’s entity; none in the data came from other entities.')
    expect(creditText({ ...base, consolidation_credit: 'source' })).toBe('Count under the source validator’s entity, as elsewhere.')
    expect(creditingEntities([base, { ...base, entity: 'Other', consolidation_credit: 'source' }])).toEqual(['Lido CM v2'])
  })
})
