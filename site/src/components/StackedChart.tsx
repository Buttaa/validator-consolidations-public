// Daily stacked bars by credential type with keyboard/tap-accessible per-segment tooltips.
// Uncollected days are never drawn as zero: they become shaded bands, and a skipped
// stretch of days is marked with an explicit axis break.
import { useMemo } from 'react'
import { compactNumber, eth, exactEth } from '../data/eth'
import { PREFIXES, axisBreaks, daySplits, notCollectedRuns, sumSplits, type Bucket, type DailyBuckets, type EntitySplit } from '../data/models'
import type { DayEntry, EntityDay } from '../data/schema'
import { PUBLIC_ROWS, isOther, restLabel } from '../data/public'
import { useTooltip, type TooltipContent, type TooltipTable, type TooltipTableRow } from './Tooltip'
import { useWidth } from './useWidth'

/** Credential colors, validated with the dataviz checks against the #0c0c0e panel surface in stack order
 *  (0x00, 0x01, 0x02, Unknown, plus the donut's wrap pair): lightness band, chroma floor, CVD and normal-vision
 *  separation, contrast. The old 0x00 gray failed the chroma floor and read as "no data". Mirrored in styles.css. */
export const PALETTE: Record<string, string> = { '0x00': '#199e70', '0x01': '#3987e5', '0x02': '#c98500', Unknown: '#9085e9' }

const TOP_ENTITIES = PUBLIC_ROWS

interface Props {
  days: string[]
  data: DailyBuckets
  metric: 'wei' | 'count'
  normalized?: boolean
  dayEntries: Map<string, DayEntry>
  allDays: DailyBuckets
  contributions: Map<string, EntityDay[]>
  selectedEntity: string
  modeLabel: string
  label: string
}

const HEIGHT = 290
const LEFT = 56
const TOP = 32
const BASE = 240

export function StackedChart({ days, data, metric, normalized = false, dayEntries, allDays, contributions, selectedEntity, modeLabel, label }: Props) {
  const { ref, width: WIDTH } = useWidth()
  const PLOT = WIDTH - LEFT - 16
  const step = PLOT / Math.max(1, days.length)
  const collected = (day: string) => {
    const entry = dayEntries.get(day)
    return Boolean(entry) && entry!.state !== 'not_collected'
  }
  const breaks = axisBreaks(days)
  const runs = notCollectedRuns(days, collected)
  const value = (b: { wei: bigint; count: number }) => (metric === 'wei' ? Number(b.wei) / 1e18 : b.count)
  const total = (day: string) => PREFIXES.reduce((sum, p) => sum + value(data[day]?.[p] || { wei: 0n, count: 0 }), 0)
  const maximum = normalized ? 100 : Math.max(1, ...days.filter(collected).map(total))
  const every = Math.ceil(days.length / Math.max(4, Math.floor(PLOT / 64)))
  // Every entity's split across credential types, per day, computed once per chart rather than per segment.
  const splits = useMemo(() => {
    const byDay = new Map<string, EntityDay[]>()
    for (const [key, rows] of contributions) {
      const day = key.slice(0, key.indexOf('|'))
      byDay.set(day, [...(byDay.get(day) || []), ...rows])
    }
    return new Map([...byDay].map(([day, rows]) => [day, daySplits(rows, metric)]))
  }, [contributions, metric])
  return (
    <>
      <div className="chart-scroll" ref={ref}>
        <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label={label}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={LEFT} x2={WIDTH - 12} y1={BASE - i * 50} y2={BASE - i * 50} stroke="#26282c" />
              <text x={LEFT - 8} y={BASE - i * 50 + 4} textAnchor="end">{normalized ? `${i * 25}%` : compactNumber((maximum * i) / 4)}</text>
            </g>
          ))}
          {runs.map((run) => (
            <GapBand key={run.start} x={LEFT + run.start * step} width={run.days * step} count={run.days}
              from={days[run.start]} to={days[run.end]} />
          ))}
          {days.map((day, i) => {
            const x = LEFT + i * step + step * 0.12
            const sum = total(day)
            let y = BASE
            return (
              <g key={day}>
                {collected(day) && !sum && days.length <= 12 && <text x={x + step * 0.38} y={BASE - 15} textAnchor="middle">No deposits</text>}
                {collected(day) && sum > 0 && PREFIXES.map((p) => {
                  const bucket = data[day]?.[p] || { wei: 0n, count: 0 }
                  const amount = value(bucket)
                  if (!amount) return null
                  const h = (normalized ? amount / sum : amount / maximum) * 200
                  y -= h
                  const content: TooltipContent = {
                    title: `${day} · ${p}`, subtitle: selectedEntity || 'All entities',
                    rows: [[`${p} ETH deposited`, exactEth(bucket.wei) + ' ETH', PALETTE[p]], [`${p} deposit events`, bucket.count.toLocaleString('en-US')],
                      [`${p} share of this bar’s ${metric === 'wei' ? 'ETH' : 'events'}`, ((amount / sum) * 100).toFixed(2) + '%']],
                    table: readout(day, p, splits.get(day) || [], allDays[day] || {}, metric, selectedEntity),
                    note: `${modeLabel}. The shaded column is the ${p} segment you are on.${selectedEntity ? '' : ` Top ${TOP_ENTITIES} entities by the day’s total; the rest are summed in Other.`} Every entity, day and credential total is in DLY → All entries.`,
                  }
                  return <Segment key={p} x={x} y={y} width={Math.max(2, step * 0.76)} height={h} fill={PALETTE[p]} content={content} aria={`${day}, ${p}, ${eth(bucket.wei)} ETH, ${bucket.count} deposits`} />
                })}
                {(days.length <= 12 || i % every === 0) && <text x={x + step * 0.38} y={BASE + 24} textAnchor="middle">{day.slice(5)}</text>}
              </g>
            )
          })}
          {breaks.map((b) => <AxisBreakMark key={b.index} x={LEFT + b.index * step} missing={b.missing} from={b.from} to={b.to} />)}
        </svg>
      </div>
      <div className="legend">{PREFIXES.map((p) => <span key={p}><i style={{ background: PALETTE[p] }} />{p}</span>)}</div>
      {breaks.length > 0 && (
        <p className="note">
          The axis is not continuous: {breaks.map((b) => `${b.missing.toLocaleString('en-US')} not-collected ${b.missing === 1 ? 'day is' : 'days are'} skipped between ${b.from} and ${b.to}`).join('; ')}. Choose a custom range to show those days as gaps.
        </p>
      )}
    </>
  )
}

const fmtBucket = (metric: 'wei' | 'count') => (bucket?: Bucket) => {
  if (!bucket || (metric === 'wei' ? !bucket.wei : !bucket.count)) return '—'
  return metric === 'wei' ? eth(bucket.wei) : bucket.count.toLocaleString('en-US')
}

const share = (part: Bucket | undefined, whole: Bucket | undefined, metric: 'wei' | 'count') => {
  const p = part ? (metric === 'wei' ? Number(part.wei) : part.count) : 0
  const w = whole ? (metric === 'wei' ? Number(whole.wei) : whole.count) : 0
  return w ? ((p / w) * 100).toFixed(1) + '%' : '—'
}

/** The day's deposits as entity rows × credential columns, so every segment's tooltip shows who deposited into which type. */
function readout(day: string, hovered: string, splits: EntitySplit[], dayBuckets: Record<string, Bucket>, metric: 'wei' | 'count', selectedEntity: string): TooltipTable {
  const fmt = fmtBucket(metric)
  const prefixes = PREFIXES.filter((p) => p !== 'Unknown' || (dayBuckets.Unknown?.count || 0) > 0 || hovered === 'Unknown')
  const dayTotal = PREFIXES.reduce<Bucket>((sum, p) => ({ wei: sum.wei + (dayBuckets[p]?.wei || 0n), count: sum.count + (dayBuckets[p]?.count || 0) }), { wei: 0n, count: 0 })
  const columns = [...prefixes.map((p) => ({ label: p, color: PALETTE[p], active: p === hovered })), { label: 'Total' }]
  const noun = metric === 'wei' ? 'Deposited ETH' : 'Deposit events'
  const allRow = { label: 'All entities', total: true, cells: [...prefixes.map((p) => fmt(dayBuckets[p])), fmt(dayTotal)] }
  if (selectedEntity) {
    const mine = splits.find((split) => split.entity === selectedEntity)
    return {
      caption: `${noun} by credential · ${day}`, first: 'Entity', columns,
      rows: [
        { entity: selectedEntity, cells: [...prefixes.map((p) => fmt(mine?.buckets[p])), fmt(mine?.total)] },
        allRow,
        { label: 'Entity share', cells: [...prefixes.map((p) => share(mine?.buckets[p], dayBuckets[p], metric)), share(mine?.total, dayTotal, metric)] },
      ],
    }
  }
  const top = splits.filter((split) => !isOther(split.entity)).slice(0, TOP_ENTITIES)
  const rest = splits.filter((split) => !top.includes(split))
  const rows: TooltipTableRow[] = top.map((split) => ({ entity: split.entity, cells: [...prefixes.map((p) => fmt(split.buckets[p])), fmt(split.total)] }))
  if (rest.length) rows.push({ label: restLabel(rest.map((split) => split.entity)), cells: [...prefixes.map((p) => fmt(sumSplits(rest, p))), fmt(sumSplits(rest))] })
  return { caption: `${noun} by entity and credential · ${day}`, first: 'Entity', columns, rows: [...rows, { ...allRow, label: 'Day total' }] }
}

function Segment({ x, y, width, height, fill, content, aria }: { x: number; y: number; width: number; height: number; fill: string; content: TooltipContent; aria: string }) {
  const tooltip = useTooltip(content)
  return <rect x={x} y={y} width={width} height={height} fill={fill} aria-label={aria} {...tooltip} />
}

function GapBand({ x, width, count, from, to }: { x: number; width: number; count: number; from: string; to: string }) {
  const range = from === to ? from : `${from} to ${to}`
  const noun = count === 1 ? 'day' : 'days'
  const tooltip = useTooltip({
    title: `${count.toLocaleString('en-US')} ${noun} not collected`,
    subtitle: range,
    lines: [`${count === 1 ? 'This UTC day has' : 'These UTC days have'} not been downloaded. Missing days are missing data, not zero activity.`],
  })
  return (
    <g>
      <rect x={x} y={TOP} width={width} height={BASE - TOP} fill="#0c0c0e" stroke="#3b3e44" strokeDasharray="3 3"
        aria-label={`${range}, ${count} ${noun} not collected`} {...tooltip} />
      {width >= 86 && <text x={x + width / 2} y={(TOP + BASE) / 2} textAnchor="middle">{count} {noun} not collected</text>}
      {width < 86 && width >= 26 && <text x={x + width / 2} y={(TOP + BASE) / 2} textAnchor="middle">{count}d</text>}
    </g>
  )
}

function AxisBreakMark({ x, missing, from, to }: { x: number; missing: number; from: string; to: string }) {
  const tooltip = useTooltip({
    title: `${missing.toLocaleString('en-US')} not-collected ${missing === 1 ? 'day' : 'days'} skipped`,
    subtitle: `Between ${from} and ${to}`,
    lines: ['The axis jumps here because these days have no downloaded data. Choose a custom range to show them as gaps.'],
  })
  return (
    <g className="axis-break" {...tooltip} aria-label={`Axis break: ${missing} days skipped between ${from} and ${to}`}>
      <rect x={x - 7} y={TOP} width={14} height={BASE - TOP + 16} fill="transparent" />
      <line x1={x} x2={x} y1={TOP} y2={BASE} stroke="#66635b" strokeDasharray="4 4" />
      <path d={`M${x - 6},${BASE + 10} l6,-7 l0,14 l6,-7`} fill="none" stroke="#66635b" strokeWidth="1.5" />
    </g>
  )
}
