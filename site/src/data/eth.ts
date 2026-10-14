// Integer-wei formatting. k = thousand, m = million; a dot marks the decimal part.
const WEI = 10n ** 18n

export function eth(value: string | bigint | number | null | undefined): string {
  if (value === null || value === undefined) return 'Unavailable'
  const amount = BigInt(value)
  let divisor = 1n
  let suffix = ''
  for (const [d, s] of [[1000000000n, 'b'], [1000000n, 'm'], [1000n, 'k']] as const) {
    if (amount >= d * WEI) { divisor = d; suffix = s; break }
  }
  const unit = divisor * 10n ** 15n
  const milli = (amount + unit / 2n) / unit
  return ((milli / 1000n).toString() + '.' + (milli % 1000n).toString().padStart(3, '0')).replace(/\.?0+$/, '') + suffix
}

export function exactEth(value: string | bigint | number): string {
  const n = BigInt(value)
  const whole = (n / WEI).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const fraction = (n % WEI).toString().padStart(18, '0').replace(/0+$/, '').padEnd(1, '0')
  return whole + '.' + fraction
}

export function compactNumber(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'm'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export const percent = (part: bigint | number, whole: bigint | number, digits = 2): string => {
  const p = Number(part)
  const w = Number(whole)
  return (w ? (p / w) * 100 : 0).toFixed(digits) + '%'
}
