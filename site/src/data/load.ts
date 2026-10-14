// Static data loading. Every file is exported by export_site.py; the page never calls Beaconcha.in.
import { useEffect, useState } from 'react'
import type { BalanceRow, BalanceShard } from './schema'

export const DATA_BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/') + 'data/'
const cache = new Map<string, Promise<unknown>>()

export function fetchJson<T>(path: string, fresh = false): Promise<T> {
  let pending = fresh ? undefined : cache.get(path)
  if (!pending) {
    pending = fetch(DATA_BASE + path, { cache: fresh ? 'reload' : 'default' }).then((response) => {
      if (!response.ok) throw new Error(`${response.status} for ${path}`)
      return response.json()
    })
    pending.catch(() => cache.delete(path))
    cache.set(path, pending)
  }
  return pending as Promise<T>
}

export function clearCache() {
  cache.clear()
}

export interface Loaded<T> { data: Map<string, T>; loading: number; errors: string[] }

/** Load several files in parallel; results appear as each arrives. */
export function useMany<T>(paths: string[]): Loaded<T> {
  const key = paths.join('|')
  const [state, setState] = useState<{ key: string; data: Map<string, T>; errors: string[] }>({ key: '', data: new Map(), errors: [] })
  useEffect(() => {
    let live = true
    const data = new Map<string, T>()
    const errors: string[] = []
    setState({ key, data: new Map(), errors: [] })
    for (const path of paths) {
      fetchJson<T>(path).then(
        (value) => { if (!live) return; data.set(path, value); setState({ key, data: new Map(data), errors: [...errors] }) },
        (error) => { if (!live) return; errors.push(String(error)); setState({ key, data: new Map(data), errors: [...errors] }) })
    }
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const current = state.key === key ? state : { data: new Map<string, T>(), errors: [] }
  return { data: current.data, loading: paths.length - current.data.size - current.errors.length, errors: current.errors }
}

export function expandBalances(shard: BalanceShard): BalanceRow[] {
  const at = Object.fromEntries(shard.columns.map((c, i) => [c, i]))
  return shard.rows.map((r) => ({
    index: r[at.index] as number, entity: r[at.entity] as string, prefix: r[at.prefix] as string, active: r[at.active] as boolean,
    effective_wei: r[at.effective_wei] as string, actual_wei: r[at.actual_wei] as string,
    v1_source_epoch: r[at.v1_source_epoch] as number | null, epoch: shard.epoch, utc: shard.utc, scope: shard.scope,
  }))
}
