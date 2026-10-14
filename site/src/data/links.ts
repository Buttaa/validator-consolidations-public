// External explorer links. Pure so the shapes are testable; the components live in components/basics.tsx.
export const EXPLORER = 'https://beaconcha.in'
export const ADDRESS = /^0x[0-9a-f]{40}$/i
export const TX = /^0x[0-9a-f]{64}$/i
export const PUBKEY = /^0x[0-9a-f]{96}$/i
/** 0x01 / 0x02 withdrawal credentials embed an execution address in their last 20 bytes. */
export const CREDENTIAL = /^0x0[12]0{22}([0-9a-f]{40})$/i

export const explorerUrl = (kind: string, value: string | number) => `${EXPLORER}/${kind}/${encodeURIComponent(String(value))}`
export const etherscanUrl = (address: string) => `https://etherscan.io/address/${encodeURIComponent(address)}`
export const arkhamUrl = (address: string) => `https://arkm.com/explorer/address/${encodeURIComponent(address)}`

/** The execution address a value names: the value itself, or the one inside a 0x01/0x02 credential. */
export function addressOf(value: string): string | null {
  if (ADDRESS.test(value)) return value
  const match = CREDENTIAL.exec(value)
  return match ? '0x' + match[1] : null
}

/** Provider entities have a page on beaconcha.in (`/entity/<name>/-`, as the explorer's own templates link them);
 *  address-shaped labels are execution addresses; "Unknown entity" has no page. */
export function entityUrl(name: string): string | null {
  if (!name || name === 'Unknown entity') return null
  if (ADDRESS.test(name)) return explorerUrl('address', name)
  return `${EXPLORER}/entity/${encodeURIComponent(name)}/-`
}

export type LinkKind = 'entity' | 'address' | 'credential' | 'tx' | 'validator' | null
const ENTITY_COLUMNS = new Set(['entity', 'source_entity', 'target_entity'])

/** What a table value links to, by column and shape. */
export function linkKind(value: string, column?: string): LinkKind {
  if (column && ENTITY_COLUMNS.has(column)) return 'entity'
  if (ADDRESS.test(value)) return 'address'
  // Before tx: a 0x01/0x02 credential is also 32 bytes of hex, and used to be linked as a transaction.
  if (CREDENTIAL.test(value)) return 'credential'
  if (TX.test(value)) return 'tx'
  if (PUBKEY.test(value)) return 'validator'
  return null
}

/** Named entities before address-shaped labels; each group keeps the order it was given. */
export function namesFirst<T>(items: T[], name: (item: T) => string): T[] {
  return [...items.filter((item) => !ADDRESS.test(name(item))), ...items.filter((item) => ADDRESS.test(name(item)))]
}

/** Alphabetical, ignoring case, with named entities before addresses. */
export const byEntityName = (names: string[]) =>
  namesFirst([...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })), (n) => n)

