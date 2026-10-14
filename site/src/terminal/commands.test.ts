import { describe, expect, test } from 'vitest'
import { SCREENS, resolveCommand, screenFromHash } from './commands'

const entities = ['Lido', 'Lido CSM', 'Lido CM v2', 'Kraken', 'Everstake', '0x39c3911cad928028a40e7ae65bbcab292f56e4a5']

describe('command line', () => {
  test('mnemonics, digits, ids and aliases open screens, with or without <GO>', () => {
    expect(resolveCommand('DEP', entities)).toEqual({ kind: 'screen', screen: 'deposits' })
    expect(resolveCommand('con <GO>', entities)).toEqual({ kind: 'screen', screen: 'requests' })
    expect(resolveCommand('3', entities)).toEqual({ kind: 'screen', screen: 'requests' })
    expect(resolveCommand('gaps GO', entities)).toEqual({ kind: 'screen', screen: 'coverage' })
    expect(resolveCommand('?', entities)).toEqual({ kind: 'screen', screen: 'help' })
  })
  test('entity names match exactly or by unique prefix, never ambiguously', () => {
    expect(resolveCommand('kraken', entities)).toEqual({ kind: 'entity', entity: 'Kraken' })
    expect(resolveCommand('Ever', entities)).toEqual({ kind: 'entity', entity: 'Everstake' })
    expect(resolveCommand('Lido', entities)).toEqual({ kind: 'entity', entity: 'Lido' })
    expect(resolveCommand('Li', entities)).toEqual({ kind: 'unknown', input: 'Li' })
  })
  test('names typed without spaces or punctuation resolve when only one entity fits', () => {
    expect(resolveCommand('lido cmv2', entities)).toEqual({ kind: 'entity', entity: 'Lido CM v2' })
    expect(resolveCommand('LidoCMv2 <GO>', entities)).toEqual({ kind: 'entity', entity: 'Lido CM v2' })
    expect(resolveCommand('cmv2', entities)).toEqual({ kind: 'entity', entity: 'Lido CM v2' })
    expect(resolveCommand('lidoc', entities)).toEqual({ kind: 'unknown', input: 'lidoc' })
    // Hex fragments of an address-shaped entity never resolve to it by containment.
    expect(resolveCommand('39c3911', entities)).toEqual({ kind: 'unknown', input: '39c3911' })
    expect(resolveCommand('c3911cad', entities)).toEqual({ kind: 'unknown', input: 'c3911cad' })
  })
  test('validator indices, hashes and dates become record searches', () => {
    expect(resolveCommand('2359544', entities)).toEqual({ kind: 'search', screen: 'deposits', query: '2359544' })
    expect(resolveCommand('0x39c3911cad928028a40e7ae65bbcab292f56e4a5', entities)).toEqual({ kind: 'entity', entity: '0x39c3911cad928028a40e7ae65bbcab292f56e4a5' })
    expect(resolveCommand('0xabc', entities)).toEqual({ kind: 'search', screen: 'deposits', query: '0xabc' })
    expect(resolveCommand('2026-09-07', entities)).toEqual({ kind: 'search', screen: 'deposits', query: '2026-09-07' })
    expect(resolveCommand('   ', entities).kind).toBe('unknown')
  })
  test('hashes map new codes and the old report anchors; every screen has a unique key and code', () => {
    expect(screenFromHash('#DEP')).toBe('deposits')
    expect(screenFromHash('#recent-consolidations')).toBe('requests')
    expect(screenFromHash('#coverage')).toBe('coverage')
    expect(screenFromHash('#nope')).toBeNull()
    expect(screenFromHash('')).toBeNull()
    expect(new Set(SCREENS.map((s) => s.key)).size).toBe(SCREENS.length)
    expect(new Set(SCREENS.map((s) => s.code)).size).toBe(SCREENS.length)
  })
})
