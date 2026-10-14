// One daily series on an axis fitted to its own range: a line needs no zero baseline, and a
// zero-based axis flattens a 2–3% move into a straight line. The latest value is labelled at the end.
import { formatTick, niceDomain } from '../data/scale'
import { useTooltip, type TooltipContent } from './Tooltip'
import { useWidth } from './useWidth'

interface Props { days: string[]; values: (number | null)[]; name: string; label: string; color?: string }

const HEIGHT = 220
const LEFT = 56
const RIGHT = 72
const TOP = 16
const BASE = 184

export function LineChart({ days, values, name, label, color = '#e9e6dc' }: Props) {
  const { ref, width: WIDTH } = useWidth()
  const points = values.map((v, i) => (v === null || v === undefined ? null : { i, v }))
  const present = points.filter((p): p is { i: number; v: number } => p !== null)
  if (!present.length) return <div ref={ref}><p className="empty">No data for the selected days.</p></div>
  const PLOT = WIDTH - LEFT - RIGHT
  const step = PLOT / Math.max(1, days.length)
  const { lo, hi, step: tick } = niceDomain(Math.min(...present.map((p) => p.v)), Math.max(...present.map((p) => p.v)))
  const x = (i: number) => LEFT + i * step + step / 2
  const y = (v: number) => BASE - ((v - lo) / (hi - lo)) * (BASE - TOP)
  const ticks: number[] = []
  for (let t = lo; t <= hi + tick / 2; t += tick) ticks.push(t)
  const segments: string[] = []
  let run: string[] = []
  for (const p of points) {
    if (p) run.push(`${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`)
    else if (run.length) { segments.push(run.join(' ')); run = [] }
  }
  if (run.length) segments.push(run.join(' '))
  const first = present[0]
  const last = present[present.length - 1]
  const every = Math.ceil(days.length / Math.max(4, Math.floor(PLOT / 64)))
  const change = (v: number) => {
    const delta = v - first.v
    return `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')} (${delta >= 0 ? '+' : '−'}${Math.abs((delta / first.v) * 100).toFixed(2)}%)`
  }
  return (
    <div className="chart-scroll" ref={ref}>
      <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img"
        aria-label={`${label}: ${first.v.toLocaleString('en-US')} on ${days[first.i]} to ${last.v.toLocaleString('en-US')} on ${days[last.i]}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(t)} y2={y(t)} stroke="#26282c" />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end">{formatTick(t, tick)}</text>
          </g>
        ))}
        {segments.map((seg, i) => <polyline key={i} points={seg} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
        <circle cx={x(last.i)} cy={y(last.v)} r={4} fill={color} stroke="#0c0c0e" strokeWidth={2} />
        <text x={x(last.i) + 9} y={y(last.v) + 4} className="end-label">{last.v.toLocaleString('en-US')}</text>
        {days.map((day, i) => (
          <g key={day}>
            {points[i] && (
              <Hit x={LEFT + i * step} width={step} aria={`${day}: ${points[i]!.v.toLocaleString('en-US')} ${name}`} content={{
                title: day,
                rows: [[name, points[i]!.v.toLocaleString('en-US'), color], [`Change since ${days[first.i]}`, change(points[i]!.v)]],
              }} />
            )}
            {(days.length <= 12 || i % every === 0) && <text x={x(i)} y={BASE + 20} textAnchor="middle">{day.slice(5)}</text>}
          </g>
        ))}
      </svg>
    </div>
  )
}

function Hit({ x, width, content, aria }: { x: number; width: number; content: TooltipContent; aria: string }) {
  const tooltip = useTooltip(content)
  return <rect className="hit" x={x} y={TOP} width={Math.max(1, width)} height={BASE - TOP} fill="transparent" aria-label={aria} {...tooltip} />
}
