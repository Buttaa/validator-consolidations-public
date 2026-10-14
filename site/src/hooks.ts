// Load per-day record shards for the selected range: newest days first, the rest on demand.
import { useMemo, useState } from 'react'
import { useMany } from './data/load'
import { useSelection } from './state'

export type ShardKind = 'deposits' | 'requests' | 'submissions'

export interface ShardRows<T> {
  rows: T[]; loading: number; busy: boolean; errors: number
  loadedDays: number; requestedDays: number; totalDays: number
  loadAll(): void
}

export function useShardRows<T>(kind: ShardKind, initial = 7): ShardRows<T> {
  const { summary, days } = useSelection()
  const [limit, setLimit] = useState(initial)
  const available = useMemo(() => {
    const files = new Set(summary.files.map((f) => f.path))
    return [...days].reverse().filter((day) => files.has(`${kind}/${day}.json`))
  }, [summary, days, kind])
  const wanted = available.slice(0, limit)
  const paths = wanted.map((day) => `${kind}/${day}.json`)
  const loaded = useMany<T[]>(paths)
  const rows = useMemo(() => wanted.flatMap((day) => loaded.data.get(`${kind}/${day}.json`) || []), [wanted.join('|'), loaded.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const loadedDays = wanted.filter((day) => loaded.data.has(`${kind}/${day}.json`)).length
  return {
    rows, loading: loaded.loading, busy: loaded.loading > 0, errors: loaded.errors.length,
    loadedDays, requestedDays: wanted.length, totalDays: available.length,
    loadAll: () => setLimit(available.length),
  }
}

export const shardStatus = (s: ShardRows<unknown>) =>
  `${s.loadedDays}/${s.totalDays} selected days loaded (${s.rows.length.toLocaleString('en-US')} rows, newest first)` +
  (s.loading ? ` · loading ${s.loading} more…` : '') + (s.errors ? ` · ${s.errors} files failed` : '')
