import { useSelection } from '../state'
import { SCREENS } from '../terminal/commands'
import { useCoverage } from '../terminal/coverage'
import { Panel } from '../terminal/Panel'
import { Screen } from '../terminal/Screen'
import { utc } from '../terminal/Shell'

export function HelpScreen() {
  const { summary } = useSelection()
  const cov = useCoverage()
  const body = (
    <div className="grid">
      <Panel span={6} title="What this is">
        <div className="prose">
          <p>An inspectable view of Ethereum staking activity built only from saved Beaconcha.in API responses: external deposits and top-ups, withdrawal credentials (0x00 / 0x01 / 0x02), entity attribution, compounding switches and cross-validator consolidations.</p>
          <p><b>Window</b> {summary.window.start} through {summary.window.end}, exclusive end, UTC · {cov.windowComplete} of {cov.windowDays} days complete · {summary.runs.length} saved {summary.runs.length === 1 ? 'run' : 'runs'} merged per slot · exported {utc(summary.exported_at)}.</p>
          <p>This page makes no API calls. Every chart, range and mode change is computed from the exported dataset; the exact saved requests are listed under each screen’s <b>API</b> view.</p>
          <h3>Honesty rules</h3>
          <ul>
            <li>Missing slot details are gaps, never zeros. Uncollected days are shaded on charts and skipped with a marked axis break in the day presets.</li>
            <li>Totals describe observed records in the selected days only. Settlement can fall outside the range.</li>
            <li>Entity labels are present-day attribution, not proof of who funded a transaction or historical ownership. Labels marked <b>Manual</b> in the entity panel come from <code>entity_labels.json</code> and name entities beaconcha.in identifies only by address. Labels marked <b>Contract</b> (Lido CM v2) are read from a staking-module contract by <code>module_labels.py</code> and applied by public key until beaconcha.in labels that module; the ENT screen shows what beaconcha.in itself calls those validators.</li>
            <li>SUB (submissions) covers only the validators enriched in this report — a partial view of Ethereum.</li>
          </ul>
        </div>
      </Panel>
      <Panel span={6} title="Credential mode · credited vs supplied">
        <div className="prose">
          <p><b>Credited</b> (default): a top-up takes the recipient validator’s credential at processing time. <b>Supplied</b>: each deposit keeps the prefix sent with it, including 0x00 placeholders. Initial deposits keep their supplied credential in both views, and total ETH and event counts never change — only the category split does. Both versions remain visible in every record.</p>
          <p><a href="https://ethereum.github.io/consensus-specs/specs/electra/beacon-chain/#apply_pending_deposit" target="_blank" rel="noopener noreferrer">Ethereum’s processing rule (apply_pending_deposit) ↗</a></p>
          <h3>Notation</h3>
          <ul>
            <li>Amounts use <b>k</b> = thousand and <b>m</b> = million ETH; a dot marks the decimal part, so 7.646k ETH ≈ 7 646 ETH. Hover any amount for the exact value.</li>
            <li>All times are UTC. Reference epochs fall immediately before each closing UTC boundary.</li>
            <li>0x02 = compounding credentials (up to 2 048 ETH effective); 0x01 = execution-address credentials; 0x00 = BLS credentials.</li>
          </ul>
        </div>
      </Panel>
      <Panel span={6} title="Keyboard">
        <div className="prose">
          <ul>
            <li><kbd>1</kbd> – <kbd>9</kbd> open a screen instantly (no animation, on purpose).</li>
            <li><kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> focus the command line; <kbd>Enter</kbd> is <b>&lt;GO&gt;</b>; <kbd>Esc</kbd> clears it.</li>
            <li><kbd>←</kbd> <kbd>→</kbd> switch views inside a screen when a tab is focused.</li>
            <li>In a records grid: <kbd>↑</kbd> <kbd>↓</kbd> <kbd>PgUp</kbd> <kbd>PgDn</kbd> <kbd>Home</kbd> <kbd>End</kbd> move the cursor, <kbd>Enter</kbd> opens the row’s API queries, <kbd>Esc</kbd> clears the selection.</li>
            <li>Hover or focus a chart mark for its tooltip; click it (or press <kbd>Enter</kbd>) to pin the tooltip so its beaconcha.in links can be used. Click the mark again, click outside, or press <kbd>Esc</kbd> to close it.</li>
            <li>Entity names open the entity panel: deposits by credential, daily chart, consolidations, balances, the network-share check, jumps into the record grids and a link to the entity’s beaconcha.in page. Execution addresses — address-shaped entity labels and the address inside 0x01/0x02 credentials — also carry <b>Etherscan</b> and <b>Arkm</b> tags. Validator indices and public keys, slots, epochs and transactions link straight to beaconcha.in.</li>
            <li><kbd>Esc</kbd> also closes dialogs. Back and forward work between screens.</li>
          </ul>
        </div>
      </Panel>
      <Panel span={6} title="Command line">
        <div className="prose">
          <p>Type a function mnemonic, an entity name, a validator index, a slot, a transaction hash or a UTC date, then <b>&lt;GO&gt;</b>. Entities need an exact name or a unique prefix; identifiers open a search over the deposit records.</p>
          <ul>
            {SCREENS.map((s) => <li key={s.id}><kbd>{s.code}</kbd> {s.title} — {s.hint}</li>)}
            <li><kbd>LIDO</kbd> every Lido deposit in the selected days · <kbd>2359544</kbd> deposits involving that validator</li>
          </ul>
        </div>
      </Panel>
    </div>
  )
  return <Screen id="help" title="HELP · Definitions, keyboard, methodology" views={[{ id: 'help', label: 'Help', body: body }]} />
}
