import { describe, expect, test } from 'vitest'
import { addressOf, arkhamUrl, byEntityName, entityUrl, etherscanUrl, linkKind, namesFirst } from './links'

const address = '0x2e80b3832922041296d5fb1b31b2864c7c06f5f4'
const credential = '0x0100000000000000000000006be457e04092b28865e0cba84e3b2cfa0f871e67'

describe('explorer links', () => {
  test('addresses link to Etherscan and Arkham', () => {
    expect(etherscanUrl(address)).toBe('https://etherscan.io/address/0x2e80b3832922041296d5fb1b31b2864c7c06f5f4')
    expect(arkhamUrl(address)).toBe('https://arkm.com/explorer/address/0x2e80b3832922041296d5fb1b31b2864c7c06f5f4')
  })
  test('the address inside a 0x01 or 0x02 credential is recovered; other shapes are not addresses', () => {
    expect(addressOf(address)).toBe(address)
    expect(addressOf(credential)).toBe('0x6be457e04092b28865e0cba84e3b2cfa0f871e67')
    expect(addressOf('0x02' + credential.slice(4))).toBe('0x6be457e04092b28865e0cba84e3b2cfa0f871e67')
    expect(addressOf('0x00' + 'ab'.repeat(31))).toBeNull()
    expect(addressOf('0x' + 'ab'.repeat(32))).toBeNull()
    expect(addressOf('Lido')).toBeNull()
  })
  test('a credential is classified before a transaction hash of the same length', () => {
    expect(linkKind(credential)).toBe('credential')
    expect(linkKind('0x6ef2d64fa4960280026532b12f651ac34c55df508ccf9a3b5abe307b01431920')).toBe('tx')
    expect(linkKind(address)).toBe('address')
    expect(linkKind(address, 'entity')).toBe('entity')
    expect(linkKind('Lido', 'source_entity')).toBe('entity')
    expect(linkKind('0x' + 'a'.repeat(96))).toBe('validator')
    expect(linkKind('deposit')).toBeNull()
  })
  test('entity pages: provider names, address labels fall back to the address page, unknown has none', () => {
    expect(entityUrl('Lido CSM')).toBe('https://beaconcha.in/entity/Lido%20CSM/-')
    expect(entityUrl(address)).toBe('https://beaconcha.in/address/' + address)
    expect(entityUrl('Unknown entity')).toBeNull()
  })
})

describe('entity ordering in dropdowns', () => {
  const addr = (c: string) => '0x' + c.repeat(40)
  test('names come before addresses, alphabetically and ignoring case', () => {
    expect(byEntityName([addr('a'), 'figment', 'Bitmine:Bitgo', addr('0'), 'Lido', 'Unknown entity']))
      .toEqual(['Bitmine:Bitgo', 'figment', 'Lido', 'Unknown entity', addr('0'), addr('a')])
  })
  test('a ranked list keeps its rank within each group', () => {
    expect(namesFirst([addr('b'), 'Lido', addr('a'), 'Kraken'], (n) => n)).toEqual(['Lido', 'Kraken', addr('b'), addr('a')])
  })
})

