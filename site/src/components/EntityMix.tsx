// The largest entities as horizontal stacked bars: bar length is the entity's deposited ETH (scaled to the
// largest entity shown), segments are its credential types, so size and credential mix read together.
import { eth, percent } from '../data/eth'
import { PREFIXES, type EntityRow } from '../data/models'
import { PUBLIC_ROWS, isOther, restLabel } from '../data/public'
import { EntityLink } from './basics'
import { PALETTE } from './StackedChart'
import { useTooltip, type TooltipRow } from './Tooltip'

const FIELD: Record<string, 'eth00_wei' | 'eth01_wei' | 'eth02_wei' | 'unknown_wei'> = { '0x00': 'eth00_wei', '0x01': 'eth01_wei', '0x02': 'eth02_wei', Unknown: 'unknown_wei' }
/** Unknown only appears where it has deposits; the three real credential types are always listed. */
const shown = (amount: (p: string) => bigint) => PREFIXES.filter((p) => p !== 'Unknown' || amount(p) > 0n)

export function EntityMix({ entities, total, mode, limit = PUBLIC_ROWS }: { entities: EntityRow[]; total: bigint; mode: string; limit?: number }) {
  const top = entities.filter((e) => !isOther(e.entity)).slice(0, limit)
  const rest = entities.filter((e) => !top.includes(e))
  if (!top.length) return <p className="empty">No deposits in the selected days.</p>
  const max = top.reduce((m, e) => (BigInt(e.wei) > m ? BigInt(e.wei) : m), 1n)
  const other = (p: string) => rest.reduce((n, e) => n + BigInt(e[FIELD[p]]), 0n)
  const otherTotal = rest.reduce((n, e) => n + BigInt(e.wei), 0n)
  return (
    <div className="mix">
      <div className="legend">{PREFIXES.map((p) => <span key={p}><i style={{ background: PALETTE[p] }} />{p}</span>)}</div>
      <ol className="mix-rows">
        {top.map((row) => <MixRow key={row.entity} row={row} max={max} mode={mode} />)}
      </ol>
      {rest.length > 0 && (
        <div className="mix-other">
          <span>{restLabel(rest.map((e) => e.entity))}</span>
          <span className="num">{eth(otherTotal)} <span className="dim">{percent(otherTotal, total, 1)}</span></span>
          <span className="mix-split">
            {shown(other).map((p) => <span key={p}><i className="key" style={{ background: PALETTE[p] }} />{p} {other(p) > 0n ? eth(other(p)) : '—'}</span>)}
          </span>
        </div>
      )}
    </div>
  )
}

function MixRow({ row, max, mode }: { row: EntityRow; max: bigint; mode: string }) {
  const wei = BigInt(row.wei)
  const amount = (p: string) => BigInt(row[FIELD[p]])
  const tooltip = useTooltip({
    title: row.entity,
    subtitle: `Deposited ETH by credential · ${mode}`,
    rows: [
      ...shown(amount).map((p): TooltipRow => [p, amount(p) > 0n ? `${eth(amount(p))} ETH · ${percent(amount(p), wei, 1)}` : '—', PALETTE[p]]),
      ['Total', `${eth(wei)} ETH · ${row.share} of all deposited ETH`],
    ],
  })
  // Segments grow by their share of this entity; one too small to see still shows in the tooltip and the ranking.
  const parts = PREFIXES.map((p) => ({ p, weight: Number((amount(p) * 10000n) / (wei || 1n)) })).filter((part) => part.weight > 0)
  const summary = shown(amount).map((p) => `${p} ${eth(amount(p))}`).join(', ')
  return (
    <li className="mix-row">
      <span className="mix-name"><EntityLink name={row.entity} /></span>
      <span className="mix-value num">{eth(wei)} <span className="dim">{row.share}</span></span>
      <span className="mix-track" {...tooltip} aria-label={`${row.entity}: ${eth(wei)} ETH (${summary})`}>
        <span className="mix-bar" style={{ width: `${Math.max(0.6, Number((wei * 10000n) / max) / 100)}%` }}>
          {parts.map((part) => <span key={part.p} style={{ flexGrow: part.weight, background: PALETTE[part.p] }} />)}
        </span>
      </span>
    </li>
  )
}
