import { describe, expect, test } from 'vitest'
import { bundlesIn } from './build'

describe('build check', () => {
  test('finds the hashed entry bundle in served HTML and in script URLs alike', () => {
    const html = '<script type="module" crossorigin src="/assets/index-O2i920i-.js"></script><link rel="stylesheet" href="/assets/index-B7Io5kN0.css">'
    expect(bundlesIn(html)).toEqual(['assets/index-O2i920i-.js'])
    expect(bundlesIn('http://100.112.62.23:4173/assets/index-O2i920i-.js')).toEqual(bundlesIn(html))
    expect(bundlesIn('http://100.112.62.23:4173/assets/index-BE0EGMYL.js')).not.toEqual(bundlesIn(html))
    expect(bundlesIn('<script src="/src/main.tsx"></script>')).toEqual([])
  })
})
