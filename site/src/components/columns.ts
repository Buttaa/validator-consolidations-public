// Column schemas for record tables: [key, title, format]. Primary columns show inline; the rest in details.
export type Format = 'validator' | 'slot' | 'epoch' | 'tx' | 'block' | 'eth' | undefined
export type Column = [string, string, Format?]

export const columns: Record<string, Column[]> = {
  deposits: [['utc', 'Processed UTC'], ['entity', 'Entity'], ['validator', 'Validator', 'validator'], ['slot', 'Processed slot', 'slot'], ['type', 'Event'], ['wei', 'ETH', 'eth'], ['chart_prefix', 'Chart type'], ['submitted_prefix', 'Supplied type'], ['credited_prefix', 'Credited type'], ['tx', 'Transaction', 'tx'], ['included', 'Included in totals'], ['basis', 'Classification evidence']],
  daily: [['day', 'UTC day'], ['entity', 'Entity'], ['prefix', 'Credential type'], ['count', 'Deposit events'], ['wei', 'ETH', 'eth'], ['entity_eth_share', 'Entity share of this day/type ETH'], ['entity_count_share', 'Entity share of this day/type events']],
  requests: [['entity', 'Counted under'], ['source_entity', 'Source entity'], ['type', 'Event'], ['status', 'Status'], ['source', 'Source / switch validator', 'validator'], ['target', 'Target validator', 'validator'], ['target_entity', 'Target entity'], ['wei', 'ETH transferred', 'eth'], ['switch_effective_wei', 'Effective ETH before switch', 'eth'], ['switch_epoch', 'Switch balance reference epoch', 'epoch'], ['slot', 'Included slot', 'slot'], ['processed_slot', 'Processed slot', 'slot'], ['processed_utc', 'Processed UTC'], ['tx', 'Transaction', 'tx'], ['activity_amount', 'Amount / meaning']],
  balances: [['utc', 'Snapshot UTC'], ['index', 'Validator', 'validator'], ['entity', 'Entity'], ['epoch', 'Reference epoch', 'epoch'], ['prefix', 'Historical credential'], ['active', 'Included (active at snapshot)'], ['effective_wei', 'Effective ETH', 'eth'], ['actual_wei', 'Actual ETH', 'eth'], ['v1_source_epoch', 'V1 source epoch', 'epoch'], ['scope', 'Snapshot detail scope']],
  validators: [['index', 'Validator', 'validator'], ['entity', 'Entity'], ['sub_entity', 'Sub-entity · operator'], ['roles', 'Why this validator is in the group'], ['credential', 'Current withdrawal credentials'], ['activation_epoch', 'Activation epoch', 'epoch'], ['exit_epoch', 'Exit epoch', 'epoch']],
  network: [['epoch', 'Reference epoch', 'epoch'], ['validators_count', 'Active validators'], ['total_active_balance', 'Active effective ETH', 'eth'], ['finality', 'Finality']],
  submissions: [['utc', 'Submitted UTC'], ['entity', 'Entity'], ['validator', 'Validator', 'validator'], ['prefix', 'Supplied type'], ['wei', 'ETH', 'eth'], ['block', 'Execution block', 'block'], ['tx', 'Transaction', 'tx'], ['removed', 'Removed log']],
  coverage: [['slot', 'Slot', 'slot'], ['kind', 'Missing dataset'], ['status', 'Slot status'], ['count', 'Overview deposit count'], ['reason', 'Reason']],
  entitychecks: [['entity', 'Entity'], ['flow_wei', 'Selected-range deposits · ETH', 'eth'], ['estimated_stake_wei', 'Approx. standing stake · ETH', 'eth'], ['net_share_percent', 'Network stake share'], ['validator_count', 'Entity validators'], ['reference_epoch', 'Stake reference epoch', 'epoch'], ['units', 'Matched V1 amount checks'], ['status', 'Directory match']],
  entities: [['entity', 'Entity'], ['eth01_wei', '0x01 · ETH', 'eth'], ['eth02_wei', '0x02 · ETH', 'eth'], ['eth00_wei', '0x00 · ETH', 'eth'], ['wei', 'Total · ETH', 'eth'], ['share', 'Share of all ETH'], ['unknown_wei', 'Unknown credential · ETH', 'eth'], ['count', 'Deposit events']],
  days: [['day', 'UTC day'], ['state', 'State'], ['deposit_slots', 'Deposit slots'], ['request_slots', 'Request slots'], ['gaps', 'Unresolved gaps'], ['deposits', 'Deposit events'], ['requests', 'Included requests'], ['participants', 'Validators involved'], ['enriched', 'Enriched validators'], ['balances', 'Balance detail'], ['reference_epoch', 'Reference epoch', 'epoch']],
}

export const primary: Record<string, string[]> = {
  deposits: ['utc', 'entity', 'validator', 'wei', 'chart_prefix'],
  daily: ['day', 'entity', 'prefix', 'count', 'wei'],
  requests: ['entity', 'type', 'source', 'target', 'activity_amount'],
  balances: ['utc', 'index', 'entity', 'prefix', 'effective_wei'],
  validators: ['index', 'entity', 'sub_entity', 'roles'],
  network: ['epoch', 'validators_count', 'total_active_balance', 'finality'],
  submissions: ['utc', 'entity', 'validator', 'prefix', 'wei'],
  coverage: ['slot', 'kind', 'status', 'count'],
  entitychecks: ['entity', 'flow_wei', 'estimated_stake_wei', 'net_share_percent'],
  entities: ['entity', 'eth01_wei', 'eth02_wei', 'eth00_wei', 'wei', 'share'],
  days: ['day', 'state', 'deposit_slots', 'request_slots', 'deposits', 'enriched'],
}

columns.recent_deposits = columns.deposits.map((c) => (c[0] === 'chart_prefix' ? [c[0], 'Credential type'] : c))
primary.recent_deposits = ['utc', 'entity', 'validator', 'chart_prefix', 'wei']
columns.recent_consolidations = columns.requests.map((c) => (c[0] === 'source' ? [c[0], 'Source validator', 'validator'] : c))
primary.recent_consolidations = ['processed_utc', 'entity', 'source', 'target', 'wei']
