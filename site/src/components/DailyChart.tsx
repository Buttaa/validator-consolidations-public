// The daily stacked chart wired to the global selection: buckets for the whole range plus the
// per-day entity contributions its tooltips show.
import { useMemo } from 'react'
import { selectedDaily, type DailyBuckets } from '../data/models'
import type { EntityDay } from '../data/schema'
import { useSelection } from '../state'
import { StackedChart } from './StackedChart'

interface Props { data: DailyBuckets; metric: 'wei' | 'count'; normalized?: boolean; selectedEntity?: string; label: string }

export function DailyChart({ data, metric, normalized = false, selectedEntity = '', label }: Props) {
  const { summary, days, daySet, dayEntries, credited } = useSelection()
  const current = credited ? summary.deposits : summary.deposits_submitted
  const allDays = useMemo(() => selectedDaily(current.entity_daily, days), [current, days])
  const contributions = useMemo(() => {
    const map = new Map<string, EntityDay[]>()
    for (const r of current.entity_daily) {
      if (!daySet.has(r.day)) continue
      const key = r.day + '|' + r.prefix
      map.set(key, [...(map.get(key) || []), r])
    }
    return map
  }, [current, daySet])
  const modeLabel = credited ? 'Credential used when credited' : 'Credential supplied with deposit'
  return (
    <StackedChart days={days} data={data} metric={metric} normalized={normalized} dayEntries={dayEntries} allDays={allDays}
      contributions={contributions} selectedEntity={selectedEntity} modeLabel={modeLabel} label={label} />
  )
}
