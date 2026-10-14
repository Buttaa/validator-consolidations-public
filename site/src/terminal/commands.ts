// Screens and the command line. Pure so the resolver is testable without React.
import { compact, compactName } from '../data/search'
export type ScreenId = 'deposits' | 'daily' | 'requests' | 'balances' | 'network' | 'entitychecks' | 'submissions' | 'coverage' | 'help'

export interface ScreenDef { id: ScreenId; code: string; key: string; title: string; hint: string; aliases: string[] }

export const SCREENS: ScreenDef[] = [
  { id: 'deposits', code: 'DEP', key: '1', title: 'Deposits', hint: 'External ETH credited, entity ranking, every deposit', aliases: ['deposit', 'deposits', 'entities', 'entity', 'recent-deposits'] },
  { id: 'daily', code: 'DLY', key: '2', title: 'Daily', hint: 'Daily volume, counts and credential split per entity', aliases: ['daily', 'day', 'days'] },
  { id: 'requests', code: 'CON', key: '3', title: 'Consolidations', hint: 'Consolidations and compounding switches', aliases: ['consolidation', 'consolidations', 'switch', 'switches', 'requests', 'recent-consolidations'] },
  { id: 'balances', code: 'BAL', key: '4', title: 'Balances', hint: 'Effective balances of the validators behind the activity', aliases: ['balance', 'balances', 'validators', 'validator'] },
  { id: 'network', code: 'NET', key: '5', title: 'Network', hint: 'Full-network reference totals per epoch', aliases: ['network', 'epoch', 'epochs'] },
  { id: 'entitychecks', code: 'ENT', key: '6', title: 'Entity checks', hint: 'Deposit flows checked against network stake share', aliases: ['entitychecks', 'checks', 'stake'] },
  { id: 'submissions', code: 'SUB', key: '7', title: 'Submissions', hint: 'Execution-layer submissions (partial coverage)', aliases: ['submission', 'submissions', 'submitted'] },
  { id: 'coverage', code: 'COV', key: '8', title: 'Coverage', hint: 'Per-day coverage, gaps, downloads, API access checks', aliases: ['coverage', 'gaps', 'gap', 'verification', 'download', 'downloads', 'files'] },
  { id: 'help', code: 'HELP', key: '9', title: 'Help', hint: 'Definitions, keyboard, methodology', aliases: ['help', 'about', '?', 'keys', 'keyboard'] },
]

export const screenById = (id: string): ScreenDef | undefined => SCREENS.find((s) => s.id === id)

export type Command =
  | { kind: 'screen'; screen: ScreenId }
  | { kind: 'entity'; entity: string }
  | { kind: 'search'; screen: ScreenId; query: string }
  | { kind: 'unknown'; input: string }

const normalise = (input: string) => input.trim().replace(/\s*<?\s*go\s*>?\s*$/i, '').trim()

/** Bloomberg-style: a mnemonic, a screen number, an entity name, or a record identifier, then <GO>. */
export function resolveCommand(raw: string, entities: string[]): Command {
  const input = normalise(raw)
  if (!input) return { kind: 'unknown', input: raw }
  const lower = input.toLowerCase()
  const screen = SCREENS.find((s) => s.code.toLowerCase() === lower || s.key === lower || s.id === lower || s.aliases.includes(lower))
  if (screen) return { kind: 'screen', screen: screen.id }
  const exact = entities.find((e) => e.toLowerCase() === lower)
  if (exact) return { kind: 'entity', entity: exact }
  const prefixed = entities.filter((e) => e.toLowerCase().startsWith(lower))
  if (prefixed.length === 1) return { kind: 'entity', entity: prefixed[0] }
  if (/^\d+$/.test(input) || /^0x[0-9a-f]+$/i.test(input) || /^\d{4}-\d{2}-\d{2}/.test(input)) return { kind: 'search', screen: 'deposits', query: input }
  // Names typed without their spaces or punctuation ("lido cmv2", "cmv2"): one match by letters and digits.
  // Hex-looking fragments are left out so they never land on an address-shaped entity by accident.
  const key = compact(input)
  if (key.length >= 3 && !/^(0x)?[0-9a-f]+$/.test(key)) {
    for (const test of [(name: string) => name === key, (name: string) => name.startsWith(key), (name: string) => name.includes(key)]) {
      const found = entities.filter((e) => test(compactName(e)))
      if (found.length === 1) return { kind: 'entity', entity: found[0] }
      if (found.length > 1) break
    }
  }
  return { kind: 'unknown', input }
}

/** Screen from a location hash: new codes (#DEP) and the old report anchors (#deposits, #recent-deposits). */
export function screenFromHash(hash: string): ScreenId | null {
  const value = hash.replace(/^#/, '').trim().toLowerCase()
  if (!value) return null
  const match = SCREENS.find((s) => s.code.toLowerCase() === value || s.id === value || s.aliases.includes(value))
  return match ? match.id : null
}
