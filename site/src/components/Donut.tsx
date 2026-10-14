// A donut for a categorical split (credential types, entities) with a legend that carries the numbers.
import type { ReactNode } from 'react'
import { useTooltip } from './Tooltip'

export interface Slice { label: string; value: number; display: string; color: string }

interface Props {
  slices: Slice[]
  unit: string
  center: { value: string; label: string }
  legendLabel?: (slice: Slice) => ReactNode
  size?: number
}

const share = (value: number, total: number) => (total ? (value / total) * 100 : 0)

export function Donut({ slices, unit, center, legendLabel, size = 176 }: Props) {
  const total = slices.reduce((n, s) => n + s.value, 0)
  const stroke = 30
  const radius = size / 2 - stroke / 2 - 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="donut">
      <svg className="chart donut-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${center.label}: ${center.value} ${unit}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
        {total > 0 && slices.map((slice) => {
          const length = (slice.value / total) * circumference
          const at = offset
          offset += length
          return <Ring key={slice.label} slice={slice} unit={unit} pct={share(slice.value, total)} size={size} radius={radius} stroke={stroke} length={length} offset={at} circumference={circumference} />
        })}
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" className="donut-center">{center.value}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="donut-caption">{center.label}</text>
      </svg>
      <ul className="donut-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span className="donut-name">{legendLabel ? legendLabel(slice) : slice.label}</span>
            <span className="num">{slice.display}</span>
            <span className="num dim">{share(slice.value, total).toFixed(1)}%</span>
          </li>
        ))}
        {total === 0 && <li className="empty">Nothing in the selected days.</li>}
      </ul>
    </div>
  )
}

function Ring({ slice, unit, pct, size, radius, stroke, length, offset, circumference }: {
  slice: Slice; unit: string; pct: number; size: number; radius: number; stroke: number; length: number; offset: number; circumference: number
}) {
  const tooltip = useTooltip({ title: slice.label, rows: [[unit, slice.display], ['Share', pct.toFixed(2) + '%']] })
  if (length <= 0) return null
  return (
    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={slice.color} strokeWidth={stroke}
      strokeDasharray={`${Math.max(0.5, length)} ${circumference}`} strokeDashoffset={-offset}
      transform={`rotate(-90 ${size / 2} ${size / 2})`} aria-label={`${slice.label}: ${slice.display} ${unit}, ${pct.toFixed(1)}%`} {...tooltip} />
  )
}
