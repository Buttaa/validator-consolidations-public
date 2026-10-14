import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { QueryDialogProvider } from './components/QueryDialog'
import { TooltipProvider } from './components/Tooltip'
import { newerBuildAvailable } from './data/build'
import { clearCache, fetchJson } from './data/load'
import type { Summary } from './data/schema'
import { SelectionProvider } from './state'
import { EntityPanelProvider } from './terminal/EntityPanel'
import { NavigationProvider } from './terminal/navigation'
import { Shell } from './terminal/Shell'

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback((fresh: boolean) => {
    if (fresh) clearCache()
    fetchJson<Summary>('summary.json', fresh).then((s) => { setSummary(s); setError(null) }, (e) => setError(String(e)))
  }, [])
  useEffect(() => { load(false) }, [load])
  if (error) {
    return (
      <Frame>
        <p className="red u" role="alert">DATASET UNAVAILABLE — {error}</p>
        <p className="note">Run <code>python export_site.py</code> in the project folder, then reload.</p>
      </Frame>
    )
  }
  if (!summary) return <Frame><p className="amber u" role="status"><span className="busy-dot" aria-hidden="true" />Loading the merged collection…</p></Frame>
  return (
    <EntityPanelProvider>
      <TooltipProvider>
        <QueryDialogProvider>
          <SelectionProvider summary={summary} onRefresh={() => { void newerBuildAvailable().then((newer) => (newer ? window.location.reload() : load(true))) }}>
            <NavigationProvider>
              <Shell />
            </NavigationProvider>
          </SelectionProvider>
        </QueryDialogProvider>
      </TooltipProvider>
    </EntityPanelProvider>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="terminal">
      <header className="topbar"><div className="brand"><strong>VALIDATOR ACTIVITY</strong><span>ETHEREUM MAINNET · BEACONCHA.IN DATA</span></div></header>
      <div />
      <main id="main" className="screen">{children}</main>
    </div>
  )
}
