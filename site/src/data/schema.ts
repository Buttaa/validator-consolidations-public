// Mirrors export_site.py output (schema_version 3). tests/test_site_export.py guards the Python side.

export type Prefix = '0x00' | '0x01' | '0x02' | 'Unknown'
export type DayState = 'complete' | 'partial' | 'not_collected'

export interface RunManifest {
  id: string
  start: string
  end: string
  days: number
  enriched_scope?: string
  enrichment_finished_at?: number
  events_complete?: boolean
  last_finished_at?: number
}

export interface DayEntry {
  day: string
  state: DayState
  coverage: { deposits: number; consolidations: number }
  gaps: number
  participants: number
  enriched_share: number | null
  events: { deposits: number; requests: number }
  reference_epoch: number
  balances: 'all' | '0x02' | null
}

export interface EntityDay { day: string; entity: string; prefix: string; wei: string; count: number }

export interface DepositEntity {
  entity: string; wei: string; eth01_wei: string; eth02_wei: string; count: number; count01: number; count02: number
}

export interface DepositSummary {
  total_wei: string
  count: number
  by_prefix: Record<string, string>
  daily: Record<string, Record<string, string>>
  daily_counts: Record<string, Record<string, number>>
  entity_daily: EntityDay[]
  reclassified_count: number
  reclassified_by_day: Record<string, number>
  entities: DepositEntity[]
}

export interface RequestEntityDay {
  day: string; entity: string; requests: number; completed: number; transfer_wei: string
  switches_completed: number; switch_effective_wei: string; switch_balance_count: number
  /** Consolidation requests (not switches) by latest observed status; absent from exports made before it existed. */
  consolidation_statuses?: Record<string, number>
}

export interface RequestSummary {
  count: number
  consolidations: number
  switches: number
  completed_transfer_wei: string
  statuses: Record<string, number>
  statuses_daily: Record<string, Record<string, number>>
  daily: Record<string, Record<string, number>>
  entity_daily: RequestEntityDay[]
  entities: Omit<RequestEntityDay, 'day'>[]
}

export interface CohortDay {
  epoch: number; timestamp: number; counts: Record<string, number>; effective_wei: Record<string, string>
  compound_mean_wei: string | null; compound_median_wei: string | null
}
export interface CohortEntity { entity: string; validators: number; effective_wei: string; compound_wei: string }
export interface CohortSummary {
  daily: CohortDay[]
  latest_epoch: number | null
  histogram: Record<string, number>
  entities: CohortEntity[]
  by_epoch: Record<string, { histogram: Record<string, number>; entities: CohortEntity[] }>
}

export interface SubmissionDay { day: string; entity: string; prefix: string; wei: string; count: number }

export interface NetworkEpoch {
  epoch: number; finality: string; validators_count: number; total_active_balance: string; [key: string]: unknown
}
export interface Gap { kind: string; slot: number; reason: string; overview: Record<string, unknown> }
export interface CoverageRow { slot: number; kind: string; status: string | null; count: number | null; reason: string }
export interface UnitCheck { entity: string; processed_events: number; matched_v1_gwei_events: number; unmatched_events: number }
export interface EntityCheck {
  entity: string; flow_wei: string; estimated_stake_wei: string | null; net_share: string | null
  validator_count: number | null; reference_epoch: number | null; unit_check: UnitCheck | null; status: string
}
export interface QuerySpec {
  method: string; url: string; body: unknown; fields: string; rule: string; docs: string; example_origin?: string
}
export interface QueryStat { path: string; attempts: number; request_seconds: number }
export interface FileEntry { path: string; rows: number; bytes: number }
export interface KeyUsage { key_number: number; calls: number; first: number; last: number }

export interface Summary {
  schema_version: number
  exported_at: number
  window: { start: string; end: string }
  runs: RunManifest[]
  days: DayEntry[]
  slots_per_day: number
  deposits: DepositSummary
  deposits_submitted: DepositSummary
  requests: RequestSummary
  submissions: { count: number; total_wei: string; entity_daily: SubmissionDay[] }
  cohort: CohortSummary
  network: NetworkEpoch[]
  gaps: Gap[]
  coverage_rows: CoverageRow[]
  entitychecks: EntityCheck[]
  validation: {
    api_access?: { checked_at?: number; results: { endpoint?: string; key_number?: number; success?: boolean }[] }
    entity_crosscheck?: { reference_epoch?: number; unit_checks?: UnitCheck[]; entity_count?: number }
    v1_v2_balances?: { count: number; epoch: number; matched: boolean }
  }
  call_counts: Record<string, number>
  summed_request_seconds: number
  key_usage: KeyUsage[]
  query_stats: QueryStat[]
  queries: Record<string, QuerySpec>
  metadata_count: number
  registry_count: number
  files: FileEntry[]
  /** Curated labels from entity_labels.json for entities beaconcha.in names only by address. */
  manual_labels?: ManualLabel[]
  /** Labels read from staking-module contracts (module_labels.json), applied by public key over beaconcha.in's. */
  module_labels?: ModuleLabel[]
}

export interface ManualLabel { address: string; label: string }

export interface ModuleOperator { id: number; name: string; deposited_keys: number; validators: number }
export interface ModuleLabel {
  entity: string; module: string; names: string | null; type: string | null; precedence: 'contract' | 'provider'; note: string | null
  /** target: consolidations into the module's validators count under its label; credited_from counts those that came from other entities. */
  consolidation_credit: 'source' | 'target'; credited_from: Record<string, number>
  block: number; block_time: string | null; operators_count: number; deposited_keys: number
  /** Module validators among the exported validators, and how many carry the contract label. */
  validators: number; labelled: number
  /** beaconcha.in's own label for those validators before the overlay: entity names, bare execution addresses, none. */
  provider_named: Record<string, number>; provider_address: Record<string, number>; provider_none: number
  /** Keys were read before the window end, so later deposits may be missing. */
  stale: boolean | null
  operators: ModuleOperator[]
}

// Per-day shard rows
export interface DepositRow {
  id: string; day: string; utc: string; slot: number; validator: number | string; entity: string; type: string
  wei: string; submitted_prefix: string; credited_prefix: string; included: boolean; basis: string
  credential: string | null; tx: string | null
}
export interface RequestRow {
  /** entity is what the request counts under; source_entity differs from it only under a contract-label credit rule. */
  slot: number; source: number; target: number; entity: string; source_entity?: string; target_entity: string; type: string; status: string
  wei: string | null; processed_slot: number | null; processed_utc: string | null; tx: string | null
  switch_epoch: number | null; switch_effective_wei: string | null
}
export interface SubmissionRow {
  utc: string; validator: number | string; entity: string; prefix: string; wei: string; tx: string; block: number; removed: boolean
}
export interface ValidatorRow {
  index: number; entity: string; sub_entity?: string; roles: string; credential: string; activation_epoch: number | null; exit_epoch: number | null
}
export interface BalanceShard {
  epoch: number; day: string; utc: string; scope: 'all' | '0x02'; columns: string[]; rows: (string | number | boolean | null)[][]
}
export interface BalanceRow {
  index: number; entity: string; prefix: string; active: boolean; effective_wei: string; actual_wei: string
  v1_source_epoch: number | null; epoch: number; utc: string; scope: string
}

export type Row = Record<string, unknown>
