// Axis domains for line charts. A line needs no zero baseline, so its axis is fitted to the data.

/** A rounded domain around [min, max] with tick steps of 1, 2, 2.5 or 5 × 10^k. */
export function niceDomain(min: number, max: number, intervals = 4): { lo: number; hi: number; step: number } {
  if (min === max) {
    const pad = Math.abs(min) * 0.01 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / intervals
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step }
}

/** Tick labels with only as many decimals as the step needs: 880k, 2.5k, 1.25m. */
export function formatTick(value: number, step: number): string {
  // The fewest decimals (up to two) that represent the step exactly in this unit: 0.25m needs two, 0.5k one.
  const decimals = (unit: number) => [0, 1, 2].find((d) => Math.abs(Math.round((step / unit) * 10 ** d) - (step / unit) * 10 ** d) < 1e-6) ?? 2
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(decimals(1e6)) + 'm'
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(decimals(1e3)) + 'k'
  return value.toFixed(decimals(1))
}
