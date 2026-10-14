import { describe, expect, test } from 'vitest'
import { formatTick, niceDomain } from './scale'

describe('fitted line axes', () => {
  test('the network validator count gets an axis around its own range, not from zero', () => {
    const { lo, hi, step } = niceDomain(888145, 911512)
    expect([lo, hi, step]).toEqual([880000, 920000, 10000])
  })
  test('a growing cohort still starts near its minimum', () => {
    expect(niceDomain(4941, 65434)).toEqual({ lo: 0, hi: 80000, step: 20000 })
  })
  test('a flat series gets a small symmetric domain instead of dividing by zero', () => {
    const { lo, hi } = niceDomain(500, 500)
    expect(lo).toBeLessThan(500)
    expect(hi).toBeGreaterThan(500)
  })
  test('tick labels carry only the decimals the step needs', () => {
    expect(formatTick(880000, 10000)).toBe('880k')
    expect(formatTick(2500, 500)).toBe('2.5k')
    expect(formatTick(1250000, 250000)).toBe('1.25m')
    expect(formatTick(0, 20000)).toBe('0')
  })
})
