import { describe, expect, test } from 'vitest'
import { SECTION_QUERIES, endpointFamily, focusedQueries } from './queries'

describe('focused verification queries', () => {
  test('a deposit row gets its slot query plus validator history queries', () => {
    const queries = focusedQueries('deposits', { slot: 15138015, validator: 2355374 })
    expect(queries[0]).toEqual({
      method: 'POST', url: 'https://beaconcha.in/api/v2/ethereum/slot/deposits',
      body: { chain: 'mainnet', slot: { number: 15138015 }, page_size: 10, type_filter: ['deposit', 'top_up'] },
    })
    expect(queries.map((q) => q.url)).toContain('https://beaconcha.in/api/v1/validator/2355374/blsChange')
    expect(queries.some((q) => q.url.endsWith('/queues/compounding-switches'))).toBe(true)
  })
  test('recent tables reuse their parent kind and switches add a balance query', () => {
    const queries = focusedQueries('recent_consolidations', { slot: 5, source: 9, switch_epoch: 100 })
    expect(queries[0].url).toBe('https://beaconcha.in/api/v2/ethereum/slot/consolidations')
    expect(queries.map((q) => q.url)).toContain('https://beaconcha.in/api/v1/validator/9/balancehistory?latest_epoch=99&limit=1')
  })
  test('entity checks query the directory and the reference epoch', () => {
    const queries = focusedQueries('entitychecks', { reference_epoch: 473906 })
    expect(queries.map((q) => q.url)).toEqual([
      'https://beaconcha.in/api/v2/ethereum/entities', 'https://beaconcha.in/api/v2/ethereum/epoch'])
  })
  test('endpoint families collapse validator batches like the exporter', () => {
    expect(endpointFamily('https://beaconcha.in/api/v1/validator/1,2,3/balancehistory?latest_epoch=5&limit=1'))
      .toBe('/api/v1/validator/{identifiers}/balancehistory')
    expect(endpointFamily('https://beaconcha.in/api/v2/ethereum/slot/deposits')).toBe('/api/v2/ethereum/slot/deposits')
    expect(SECTION_QUERIES.balances).toContain('balance_check')
  })
})
