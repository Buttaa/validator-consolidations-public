// Coverage of the selected days, shared by the COV key's gap badge, the coverage screen and the help text.
import { useMemo } from 'react'
import { useSelection } from '../state'

export function useCoverage() {
  const { summary, days, dayEntries } = useSelection()
  return useMemo(() => {
    const c = { deposits: 0, consolidations: 0, gaps: 0, participants: 0, enriched: 0, complete: 0, partial: 0, notCollected: 0 }
    for (const day of days) {
      const d = dayEntries.get(day)
      if (!d) { c.notCollected += 1; continue }
      c.deposits += d.coverage.deposits
      c.consolidations += d.coverage.consolidations
      c.gaps += d.gaps
      c.participants += d.participants
      c.enriched += Math.round((d.enriched_share || 0) * d.participants)
      if (d.state === 'complete') c.complete += 1
      else if (d.state === 'partial') c.partial += 1
      else c.notCollected += 1
    }
    const expected = days.length * summary.slots_per_day
    const unlabelled = c.participants - c.enriched
    const incomplete = c.complete !== days.length
    return {
      ...c, expected, unlabelled, incomplete, selected: days.length,
      windowDays: summary.days.length, windowComplete: summary.days.filter((d) => d.state === 'complete').length,
      preview: incomplete || unlabelled > 0,
    }
  }, [summary, days, dayEntries])
}
