// The Bloomberg-style command line: a function mnemonic, an entity, or a record identifier, then <GO>.
import { Command } from 'cmdk'
import { useMemo, useRef, useState } from 'react'
import { namesFirst } from '../data/links'
import { entityBreakdown } from '../data/models'
import { compact, compactName } from '../data/search'
import { isOther } from '../data/public'
import { useSelection } from '../state'
import { SCREENS, resolveCommand, type Command as Resolved } from './commands'
import { useEntityPanel } from './EntityPanel'
import { useNavigation } from './navigation'

/** cmdk owns the input id (aria wiring), so the shell focuses it by attribute instead. */
export const COMMAND_INPUT_SELECTOR = '.cmd [cmdk-input]'

/** Prefix/substring ranking instead of cmdk's fuzzy scoring, so the highlighted item is the one Enter runs
 *  ("lido" must not light up BAL because those letters occur in "validators"). */
const rank = (value: string, search: string, keywords?: string[]) => {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const hay = [value, ...(keywords || [])].map((k) => k.toLowerCase())
  if (hay.some((h) => h === q)) return 1
  if (hay.some((h) => h.startsWith(q) || h.startsWith('entity ' + q))) return 0.8
  if (hay.some((h) => h.includes(q))) return 0.5
  // "lido cmv2" for "Lido CM v2": names also match by letters and digits.
  const key = compact(q)
  if (key && hay.some((h) => compact(h).includes(key))) return 0.4
  return 0
}

export function CommandLine() {
  const nav = useNavigation()
  const panel = useEntityPanel()
  const { summary, daySet, credited } = useSelection()
  const current = credited ? summary.deposits : summary.deposits_submitted
  const entities = useMemo(() => entityBreakdown(current.entity_daily, daySet).map((e) => e.entity).filter((e) => !isOther(e)), [current, daySet])
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const run = (command: Resolved) => {
    if (command.kind === 'unknown') { setError(`UNKNOWN FUNCTION: ${command.input.toUpperCase()}`); return }
    setError('')
    if (command.kind === 'screen') nav.go(command.screen)
    else if (command.kind === 'entity') {
      // The deposits grid filtered to the entity, with its panel on top: validators, consolidations and the daily split are one click away.
      nav.go('deposits', { view: 'records', table: 'deposits', search: command.entity, exact: { entity: command.entity } })
      panel.open(command.entity)
    }
    else nav.go(command.screen, { view: 'records', table: 'deposits', search: command.query })
    setValue('')
    input.current?.blur()
  }
  const submit = () => run(resolveCommand(value, entities))
  const query = value.trim()
  // The 40 largest entities before typing; once typing, every entity whose name fits, so small ones are findable too.
  const suggested = useMemo(() => {
    const key = compact(query)
    const pool = key ? entities.filter((e) => compactName(e).includes(key) || e.toLowerCase().includes(query.toLowerCase())) : entities
    return namesFirst(pool.slice(0, 40), (e) => e)
  }, [entities, query])
  return (
    <Command className="cmd" label="Command line" loop filter={rank}>
      <span className="cmd-prompt" aria-hidden="true">›</span>
      <Command.Input ref={input} value={value} onValueChange={(v) => { setValue(v); setError('') }}
        placeholder="Function or entity, then Enter" autoComplete="off" spellCheck={false}
        aria-label="Command line" aria-invalid={error ? true : undefined}
        onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setValue(''); setError(''); e.currentTarget.blur(); return }
          // Exact mnemonics, entity names and identifiers win over cmdk's fuzzy highlight, so a
          // validator index never lands on a look-alike 0x… entity. Fuzzy is the fallback only.
          if (e.key === 'Enter') {
            const exact = resolveCommand(value, entities)
            if (exact.kind !== 'unknown') { e.preventDefault(); run(exact) }
          }
        }} />
      <button type="button" className="primary cmd-go" onMouseDown={(e) => e.preventDefault()} onClick={submit} aria-label="Go">GO</button>
      {error && <span className="red" role="alert" style={{ position: 'absolute', left: 0, top: '100%', fontSize: 10, letterSpacing: '.06em' }}>{error}</span>}
      <Command.List className="cmd-list" hidden={!open}>
          <Command.Empty>No function, entity or record matches</Command.Empty>
          <Command.Group heading="Functions">
            {SCREENS.map((s) => (
              <Command.Item key={s.id} value={s.code} keywords={[s.title, s.id, ...s.aliases]} onSelect={() => run({ kind: 'screen', screen: s.id })}>
                <kbd>{s.code}</kbd>{s.title}<span className="hint">{s.hint} · {s.key}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Entities · names first, by deposited ETH">
            {suggested.map((e) => (
              <Command.Item key={e} value={'entity ' + e} keywords={[e, compactName(e)]} onSelect={() => run({ kind: 'entity', entity: e })}>
                <kbd>ENT</kbd>{e}<span className="hint">deposits</span>
              </Command.Item>
            ))}
          </Command.Group>
          {query && (
            <Command.Group heading="Records">
              <Command.Item value={'search ' + query} forceMount onSelect={() => run({ kind: 'search', screen: 'deposits', query })}>
                <kbd>FIND</kbd>Search deposits for “{query}”
              </Command.Item>
            </Command.Group>
          )}
      </Command.List>
    </Command>
  )
}
