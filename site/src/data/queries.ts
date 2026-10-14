// Equivalent focused Beaconcha.in requests for one record. The original collection used batches and cursor pages.
import type { Row } from './schema'

export interface FocusedQuery { method: 'GET' | 'POST'; url: string; body?: Record<string, unknown> }

const BASE = 'https://beaconcha.in'
const post = (path: string, body: Record<string, unknown>): FocusedQuery => ({ method: 'POST', url: BASE + path, body: { chain: 'mainnet', ...body } })
const get = (path: string): FocusedQuery => ({ method: 'GET', url: BASE + path })

export const SECTION_QUERIES: Record<string, string[]> = {
  deposits: ['deposits', 'metadata', 'registry', 'switches', 'bls'],
  daily: ['deposits', 'metadata', 'registry', 'switches', 'bls'],
  requests: ['requests', 'metadata', 'balances'],
  balances: ['balances', 'registry', 'metadata', 'switches', 'bls', 'balance_check'],
  network: ['network'],
  entitychecks: ['entities', 'entity_network', 'deposits', 'submissions'],
  submissions: ['submissions', 'metadata'],
  coverage: ['coverage', 'deposits', 'requests'],
}

export function endpointFamily(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  return path.replace(/^\/api\/v1\/validator\/[^/]+/, '/api/v1/validator/{identifiers}')
}

export function focusedQueries(kind: string, row: Row): FocusedQuery[] {
  kind = ({ recent_deposits: 'deposits', recent_consolidations: 'requests' } as Record<string, string>)[kind] || kind
  const queries: FocusedQuery[] = []
  if (kind === 'deposits' || kind === 'requests') {
    queries.push(post('/api/v2/ethereum/slot/' + (kind === 'deposits' ? 'deposits' : 'consolidations'),
      { slot: { number: row.slot }, page_size: 10, ...(kind === 'deposits' ? { type_filter: ['deposit', 'top_up'] } : {}) }))
  }
  if (kind === 'coverage') queries.push(post('/api/v2/ethereum/slot', { slot: { number: row.slot } }))
  if (kind === 'network') queries.push(post('/api/v2/ethereum/epoch', { epoch: { number: row.epoch } }))
  if (kind === 'entitychecks') {
    queries.push(post('/api/v2/ethereum/entities', { range: { evaluation_window: '24h' }, page_size: 10 }))
    if (row.reference_epoch != null) queries.push(post('/api/v2/ethereum/epoch', { epoch: { number: row.reference_epoch } }))
  }
  const id = row.validator ?? row.index ?? row.source
  if (id != null) {
    const encoded = encodeURIComponent(String(id))
    const selected = { validator: { validator_identifiers: [id] }, page_size: 10 }
    queries.push(post('/api/v2/ethereum/validators/metadata', selected))
    if (kind === 'balances' || (kind === 'requests' && row.switch_epoch != null)) {
      queries.push(get(`/api/v1/validator/${encoded}/balancehistory?latest_epoch=${Number(row.epoch ?? row.switch_epoch) - 1}&limit=1`))
    }
    if (kind === 'submissions') queries.push(get(`/api/v1/validator/${encoded}/deposits`))
    if (['deposits', 'balances', 'validators'].includes(kind)) {
      queries.push(get(`/api/v1/validator/${encoded}`))
      queries.push(get(`/api/v1/validator/${encoded}/blsChange`))
      queries.push(post('/api/v2/ethereum/validators/queues/compounding-switches', { ...selected, status_filter: 'completed' }))
    }
  }
  return queries
}
