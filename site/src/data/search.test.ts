import { describe, expect, test } from 'vitest'
import { compact, compactName, rowMatches, searchWords } from './search'

const validator = { index: 2364972, entity: 'Lido CM v2', sub_entity: 'Attestant - PGO', roles: 'Deposit recipient', credential: '0x02000000' }

describe('search', () => {
  test('names compare by letters and digits', () => {
    expect(compact('Lido CM v2')).toBe('lidocmv2')
    expect(compactName('Bitmine:Bitgo')).toBe('bitminebitgo')
  })
  test('a name typed without its spaces still finds the row, word by word', () => {
    expect(rowMatches(validator, searchWords('lido cmv2'))).toBe(true)
    expect(rowMatches(validator, searchWords('LidoCMv2'))).toBe(true)
    expect(rowMatches(validator, searchWords('cmv2 attestant'))).toBe(true)
    expect(rowMatches(validator, searchWords('Lido CM v2'))).toBe(true)
    expect(rowMatches(validator, searchWords('2364972'))).toBe(true)
  })
  test('non-name columns keep plain matching and absent words still exclude', () => {
    expect(rowMatches(validator, searchWords('lido csm'))).toBe(false)
    expect(rowMatches(validator, searchWords('depositrecipient'))).toBe(false)
    expect(rowMatches(validator, searchWords('   '))).toBe(true)
  })
})
