// Daily consolidation requests stacked by latest observed status. Each day's tooltip lists the entities
// behind that day's requests, so recent activity can be read by entity the way deposits are.
import { useMemo } from 'react'
import { eth } from '../data/eth'
import { consolidationSplits, consolidationStatusesIn, type StatusSplit } from '../data/models'
import type { RequestSummary } from '../data/schema'
import { useSelection } from '../state'
import { PUBLIC_ROWS, isOther, restLabel } from '../data/public'
import { SeriesChart, type Series } from './SeriesChart'
import type { TooltipTable, TooltipTableRow } from './Tooltip'

/** Status colors keep clear of the credential hues in PALETTE, so a status never reads as a credential type:
 *  cyan once settled, a darker cyan while still waiting in the queue, red when rejected. */
export const STATUS_COLORS: Record<string, string> = { completed: '#4ee6d8', queued: '#1d7a73', rejected: '#ff4d4a' }
const OTHER_STATUS = '#9a968b'
const TOP_ENTITIES = PUBLIC_ROWS

const count = (n: number) => Math.round(n).toLocaleString('en-US')
const title = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)
const color = (status: string) => STATUS_COLORS[status] || OTHER_STATUS

export function ConsolidationChart({ requests }: { requests: RequestSummary }) {
  const { days, dayEntries } = useSelection()
  const statuses = useMemo(() => consolidationStatusesIn(requests, days), [requests, days])
  const series = useMemo<Series[]>(() => {
    const collected = (day: string) => {
      const entry = dayEntries.get(day)
      return Boolean(entry) && entry!.state !== 'not_collected'
    }
    // An uncollected day stays null, so the chart shades it instead of drawing a zero.
    return statuses.map((status) => ({
      key: status, label: title(status), color: color(status),
      values: days.map((day) => (collected(day) ? requests.statuses_daily[day]?.[`consolidation / ${status}`] || 0 : null)),
    }))
  }, [statuses, days, dayEntries, requests])
  const detail = (day: string) => {
    const splits = consolidationSplits(requests.entity_daily, day)
    if (!splits.length) return {}
    return {
      table: readout(day, statuses, splits),
      note: `Top ${TOP_ENTITIES} entities by the day’s requests; the rest are summed in Other. ETH moved counts completed requests only. Every request is in All entries.`,
    }
  }
  return <SeriesChart days={days} series={series} label="Daily consolidation requests by status" format={count} detail={detail} />
}

/** The day's requests as entity rows × status columns, plus the ETH their completed requests moved. */
function readout(day: string, statuses: string[], splits: StatusSplit[]): TooltipTable {
  const cells = (split: StatusSplit) => [
    ...statuses.map((s) => (split.statuses[s] ? count(split.statuses[s]) : '—')),
    count(split.total), split.transfer_wei ? eth(split.transfer_wei) : '—',
  ]
  const top = splits.filter((split) => !isOther(split.entity)).slice(0, TOP_ENTITIES)
  const rows: TooltipTableRow[] = top.map((split) => ({ entity: split.entity, cells: cells(split) }))
  const rest = splits.filter((split) => !top.includes(split))
  if (rest.length) rows.push({ label: restLabel(rest.map((split) => split.entity)), cells: cells(merge(rest)) })
  rows.push({ label: 'Day total', total: true, cells: cells(merge(splits)) })
  return {
    caption: `Consolidation requests by entity and status · ${day}`, first: 'Entity',
    columns: [...statuses.map((s) => ({ label: title(s), color: color(s) })), { label: 'Total' }, { label: 'ETH moved' }],
    rows,
  }
}

function merge(splits: StatusSplit[]): StatusSplit {
  const merged: StatusSplit = { entity: '', statuses: {}, total: 0, transfer_wei: 0n }
  for (const split of splits) {
    for (const [status, n] of Object.entries(split.statuses)) merged.statuses[status] = (merged.statuses[status] || 0) + n
    merged.total += split.total
    merged.transfer_wei += split.transfer_wei
  }
  return merged
}
