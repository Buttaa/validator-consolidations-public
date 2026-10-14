// Global selection: date range preset, credential mode, and the loaded summary.
import { createContext, useContext, useMemo, useState, useTransition, type ReactNode } from 'react'
import { dayOfEpochMap, daysInRange, presets as buildPresets, type DayRange, type Preset } from './data/models'
import type { DayEntry, Summary } from './data/schema'

export interface Selection {
  summary: Summary
  presets: Preset[]
  presetId: string
  range: DayRange
  days: string[]
  daySet: Set<string>
  dayEntries: Map<string, DayEntry>
  dayOfEpoch: Map<number, string>
  credited: boolean
  /** True while a range or credential change is being applied, so the UI can show it is working. */
  pending: boolean
  setPreset(id: string): void
  setCustomRange(range: DayRange): void
  setCredited(value: boolean): void
  refresh(): void
}

const Context = createContext<Selection | null>(null)

export function SelectionProvider({ summary, onRefresh, children }: { summary: Summary; onRefresh: () => void; children: ReactNode }) {
  const presets = useMemo(() => buildPresets(summary.days), [summary])
  const fallback: Preset = { id: 'custom', label: 'Custom range', range: { start: summary.window.start, end: summary.window.start }, days: [] }
  const [state, setState] = useState<{ presetId: string; range: DayRange; days: string[] }>(() => {
    const first = presets[0] || fallback
    return { presetId: first.id, range: first.range, days: first.days }
  })
  const [credited, setCredited] = useState(true)
  const [pending, startTransition] = useTransition()
  const value = useMemo<Selection>(() => ({
    summary, presets, credited, pending, refresh: onRefresh,
    setCredited(next) { startTransition(() => setCredited(next)) },
    presetId: state.presetId, range: state.range, days: state.days,
    daySet: new Set(state.days),
    dayEntries: new Map(summary.days.map((d) => [d.day, d])),
    dayOfEpoch: dayOfEpochMap(summary.days),
    setPreset(id) {
      const preset = presets.find((p) => p.id === id)
      if (preset) startTransition(() => setState({ presetId: id, range: preset.range, days: preset.days }))
    },
    setCustomRange(range) {
      const ordered = range.start <= range.end ? range : { start: range.end, end: range.start }
      startTransition(() => setState({ presetId: 'custom', range: ordered, days: daysInRange(summary.days, ordered).map((d) => d.day) }))
    },
  }), [summary, presets, credited, pending, state, onRefresh])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useSelection(): Selection {
  const value = useContext(Context)
  if (!value) throw new Error('useSelection outside SelectionProvider')
  return value
}
