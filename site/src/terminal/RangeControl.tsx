// Global date range in the top bar: presets from the merged collection, or a custom UTC range.
import { useEffect, useState } from 'react'
import { useSelection } from '../state'

export function RangeControl() {
  const { summary, presets, presetId, range, pending, setPreset, setCustomRange } = useSelection()
  const [draft, setDraft] = useState(range)
  useEffect(() => setDraft(range), [range])
  const last = summary.days[summary.days.length - 1]?.day || summary.window.start
  const edit = (field: 'start' | 'end') => (value: string) => {
    const next = { ...draft, [field]: value }
    setDraft(next)
    if (next.start && next.end) setCustomRange(next)
  }
  return (
    <div className="range" role="group" aria-label="Date range" aria-busy={pending}>
      <label className="field">Range
        <select value={presetId} onChange={(e) => setPreset(e.target.value)}>
          {presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          <option value="custom">Custom range</option>
        </select>
      </label>
      <label className="field">From (UTC)
        <input type="date" min={summary.window.start} max={last} value={draft.start} onChange={(e) => edit('start')(e.target.value)} />
      </label>
      <label className="field">To (UTC, incl.)
        <input type="date" min={summary.window.start} max={last} value={draft.end} onChange={(e) => edit('end')(e.target.value)} />
      </label>
      {pending && <span className="range-busy" role="status"><span className="busy-dot" aria-hidden="true" />Updating</span>}
    </div>
  )
}
