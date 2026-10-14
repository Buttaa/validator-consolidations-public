// Terminal chrome: top bar (brand, command line, range, credential mode), function keys with the clock,
// and the active screen.
import { useEffect, useState, type ComponentType } from 'react'
import { useSelection } from '../state'
import { CommandLine, COMMAND_INPUT_SELECTOR } from './CommandLine'
import { SCREENS, type ScreenId } from './commands'
import { useCoverage } from './coverage'
import { EntityPanelHost } from './EntityPanel'
import { useNavigation } from './navigation'
import { RangeControl } from './RangeControl'
import { BalancesScreen } from '../screens/Balances'
import { CoverageScreen } from '../screens/Coverage'
import { DailyScreen } from '../screens/Daily'
import { DepositsScreen } from '../screens/Deposits'
import { EntityChecksScreen } from '../screens/EntityChecks'
import { HelpScreen } from '../screens/Help'
import { NetworkScreen } from '../screens/Network'
import { RequestsScreen } from '../screens/Requests'
import { SubmissionsScreen } from '../screens/Submissions'

const COMPONENTS: Record<ScreenId, ComponentType> = {
  deposits: DepositsScreen, daily: DailyScreen, requests: RequestsScreen, balances: BalancesScreen, network: NetworkScreen,
  entitychecks: EntityChecksScreen, submissions: SubmissionsScreen, coverage: CoverageScreen, help: HelpScreen,
}

export const utc = (seconds: number) => new Date(seconds * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'

export function Shell() {
  const nav = useNavigation()
  const Active = COMPONENTS[nav.screen]
  useEffect(() => {
    const focusCommand = () => document.querySelector<HTMLInputElement>(COMMAND_INPUT_SELECTOR)?.focus()
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = Boolean(target && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable))
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); focusCommand(); return }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return
      if (e.key === '/') { e.preventDefault(); focusCommand(); return }
      if (e.key === '?') { nav.go('help'); return }
      const screen = SCREENS.find((s) => s.key === e.key)
      if (screen) nav.go(screen.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])
  return (
    <div className="terminal">
      <a className="skip" href="#main">Skip to screen</a>
      <TopBar />
      <FKeys />
      <main id="main" className="screen"><Active /></main>
      <EntityPanelHost />
    </div>
  )
}

function TopBar() {
  const { credited, setCredited } = useSelection()
  return (
    <header className="topbar">
      <div className="brand"><strong>VALIDATOR ACTIVITY</strong><span>ETHEREUM MAINNET · BEACONCHA.IN DATA</span></div>
      <CommandLine />
      <RangeControl />
      <div className="seg" role="group" aria-label="Credential basis for top-ups"
        title="Credited: top-ups use the recipient validator’s credential at processing time. Supplied: the prefix sent with each deposit, including 0x00 placeholders. See HELP.">
        <button type="button" aria-pressed={credited} onClick={() => setCredited(true)}>Credited</button>
        <button type="button" aria-pressed={!credited} onClick={() => setCredited(false)}>Supplied</button>
      </div>
    </header>
  )
}

function Clock({ exported, onReload }: { exported: number; onReload(): void }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="clock">
      <strong><span className="live" aria-hidden="true">●</span> {now.toISOString().slice(11, 19)} UTC</strong>
      <span>{now.toISOString().slice(0, 10)} · data {utc(exported).slice(0, 16)} · <button type="button" className="link" onClick={onReload}>reload</button></span>
    </div>
  )
}

function FKeys() {
  const nav = useNavigation()
  const { refresh, summary } = useSelection()
  const { gaps } = useCoverage()
  return (
    <nav className="fkeys" aria-label="Screens">
      {SCREENS.map((s) => (
        <button key={s.id} type="button" className="fkey" aria-current={nav.screen === s.id ? 'page' : undefined} onClick={() => nav.go(s.id)}
          title={`${s.hint} (key ${s.key})`}>
          <kbd>{s.key}</kbd><b>{s.code}</b><span className="hint">{s.title}</span>
          {/* The one coverage signal with no other home outside COV: unresolved slot details in the selected days. */}
          {s.id === 'coverage' && gaps > 0 && <span className="fkey-badge">{gaps.toLocaleString('en-US')} gaps</span>}
        </button>
      ))}
      <div className="spacer" />
      <Clock exported={summary.exported_at} onReload={refresh} />
    </nav>
  )
}
