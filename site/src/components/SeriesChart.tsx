// Daily stacked bars for one or more ETH series on a single zero-based axis.
// Days without a data point are drawn as shaded gaps, never as zero.
import { compactNumber } from '../data/eth'
import { useTooltip, type TooltipContent } from './Tooltip'
import { useWidth } from './useWidth'

export interface Series { key: string; label: string; color: string; values: (number | null)[] }

interface Props {
  days: string[]
  series: Series[]
  /** Appended to every tooltip amount; omit it when the chart title already names what is counted. */
  unit?: string
  label: string
  format?: (value: number) => string
  /** Extra tooltip content for a day, such as a per-entity readout table. */
  detail?: (day: string) => Pick<TooltipContent, 'subtitle' | 'table' | 'note'>
}

const HEIGHT = 260
const LEFT = 56
const RIGHT = 16
const TOP = 20
const BASE = 216

export function SeriesChart({ days, series, unit, label, format = compactNumber, detail }: Props) {
  const { ref, width: WIDTH } = useWidth()
  const PLOT = WIDTH - LEFT - RIGHT
  const step = PLOT / Math.max(1, days.length)
  const totals = days.map((_, i) => {
    const values = series.map((s) => s.values[i])
    return values.every((v) => v === null || v === undefined) ? null : values.reduce<number>((n, v) => n + (v || 0), 0)
  })
  const maximum = Math.max(1, ...totals.filter((t): t is number => t !== null))
  const every = Math.ceil(days.length / Math.max(4, Math.floor(PLOT / 64)))
  const y = (value: number) => BASE - (value / maximum) * (BASE - TOP)
  const amount = (value: number) => (unit ? `${format(value)} ${unit}` : format(value))
  return (
    <>
      <div className="chart-scroll" ref={ref}>
        <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label={label}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={LEFT} x2={WIDTH - RIGHT} y1={y((maximum * i) / 4)} y2={y((maximum * i) / 4)} stroke="#26282c" />
              <text x={LEFT - 8} y={y((maximum * i) / 4) + 4} textAnchor="end">{format((maximum * i) / 4)}</text>
            </g>
          ))}
          {days.map((day, i) => {
            const x = LEFT + i * step
            const total = totals[i]
            if (total === null) {
              return <rect key={day} x={x} y={TOP} width={Math.max(1, step)} height={BASE - TOP} fill="#0c0c0e" stroke="#3b3e44" strokeDasharray="3 3" aria-label={`${day}: no data`} />
            }
            let top = BASE
            const content: TooltipContent = {
              title: day,
              rows: [
                ...series.map((s): [string, string, string] => [s.label, s.values[i] === null || s.values[i] === undefined ? '—' : amount(s.values[i] as number), s.color]),
                ...(series.length > 1 ? [['Total', amount(total)] as [string, string]] : []),
              ],
              ...detail?.(day),
            }
            return (
              <g key={day}>
                {series.map((s) => {
                  const value = s.values[i]
                  if (!value) return null
                  const h = (value / maximum) * (BASE - TOP)
                  top -= h
                  return <rect key={s.key} x={x + step * 0.12} y={top} width={Math.max(1.5, step * 0.76)} height={h} fill={s.color} />
                })}
                <Column x={x} width={step} content={content} aria={`${day}: ${amount(total)}`} />
                {(days.length <= 12 || i % every === 0) && <text x={x + step / 2} y={BASE + 20} textAnchor="middle">{day.slice(5)}</text>}
              </g>
            )
          })}
        </svg>
      </div>
      {/* A single series is named by its panel title; a legend only earns its place for two or more. */}
      {series.length > 1 && <div className="legend">{series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}</div>}
    </>
  )
}

/** Invisible full-height hit area so the whole column, not just the bar, opens the day's tooltip. */
function Column({ x, width, content, aria }: { x: number; width: number; content: TooltipContent; aria: string }) {
  const tooltip = useTooltip(content)
  return <rect className="hit" x={x} y={TOP} width={Math.max(1, width)} height={BASE - TOP} fill="transparent" aria-label={aria} {...tooltip} />
}
