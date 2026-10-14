// One shared tooltip: hover or focus any chart mark for exact amounts and context; click (or Enter)
// pins it so its links can be used. A pinned tooltip ignores hover elsewhere until it is closed by
// clicking the mark again, clicking outside, pressing Esc or its close button.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { EntityLink } from './basics'

/** A summary row: label, value, and optionally the series color keyed beside the label. */
export type TooltipRow = [label: string, value: string, color?: string]

export interface TooltipColumn { label: string; color?: string; active?: boolean }
export interface TooltipTableRow { entity?: string; label?: string; cells: string[]; total?: boolean }
/** One readout for every series: rows are entities (or totals), columns are series such as credential types. */
export interface TooltipTable { caption: string; first: string; columns: TooltipColumn[]; rows: TooltipTableRow[] }

export interface TooltipContent {
  title: string
  subtitle?: string
  rows?: TooltipRow[]
  lines?: string[]
  table?: TooltipTable
  note?: string
}

interface Api { show(anchor: Element, content: TooltipContent): void; hide(): void; hold(): void; toggle(anchor: Element, content: TooltipContent): void; close(): void }
const Context = createContext<Api | null>(null)

interface State { anchor: Element; content: TooltipContent; pinned: boolean }

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null)
  const current = useRef<State | null>(null)
  current.current = state
  const timer = useRef<number | undefined>(undefined)
  const close = useCallback(() => { window.clearTimeout(timer.current); setState(null) }, [])
  const api = useMemo<Api>(() => ({
    show(anchor, content) {
      window.clearTimeout(timer.current)
      if (current.current?.pinned) return
      setState({ anchor, content, pinned: false })
    },
    hide() {
      window.clearTimeout(timer.current)
      if (current.current?.pinned) return
      timer.current = window.setTimeout(() => setState((s) => (s?.pinned ? s : null)), 150)
    },
    hold() { window.clearTimeout(timer.current) },
    toggle(anchor, content) {
      window.clearTimeout(timer.current)
      if (current.current?.pinned && current.current.anchor === anchor) setState(null)
      else setState({ anchor, content, pinned: true })
    },
    close,
  }), [close])
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onPointer = (e: PointerEvent) => { if (!(e.target as Element).closest?.('[data-tooltip],#chart-tooltip')) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer) }
  }, [close])
  return (
    <Context.Provider value={api}>
      {children}
      {state && <TooltipHost state={state} onEnter={api.hold} onLeave={api.hide} onClose={close} />}
    </Context.Provider>
  )
}

function TooltipHost({ state, onEnter, onLeave, onClose }: { state: State; onEnter(): void; onLeave(): void; onClose(): void }) {
  const { anchor, content, pinned } = state
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 8, top: 8, transformOrigin: 'top left' })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = anchor.getBoundingClientRect()
    const { innerWidth: vw, innerHeight: vh } = window
    const w = el.offsetWidth
    const h = el.offsetHeight
    const gap = 6
    const margin = 8
    const x = (left: number) => Math.max(margin, Math.min(left, vw - w - margin))
    const y = (top: number) => Math.max(margin, Math.min(top, vh - h - margin))
    // Below the mark, else above, else beside it: a tooltip never hides the mark it describes.
    if (rect.bottom + gap + h <= vh - margin) setPosition({ left: x(rect.left), top: rect.bottom + gap, transformOrigin: 'top left' })
    else if (rect.top - gap - h >= margin) setPosition({ left: x(rect.left), top: rect.top - gap - h, transformOrigin: 'bottom left' })
    else if (rect.right + gap + w <= vw - margin) setPosition({ left: rect.right + gap, top: y(rect.top), transformOrigin: 'top left' })
    else if (rect.left - gap - w >= margin) setPosition({ left: rect.left - gap - w, top: y(rect.top), transformOrigin: 'top right' })
    else setPosition({ left: x(rect.left), top: y(rect.bottom + gap), transformOrigin: 'top left' })
  }, [anchor, content, pinned])
  // Unpinned, the tooltip ignores the pointer (see styles.css), so marks underneath stay reachable and the
  // click that pins lands on the mark; pinned, it takes the pointer so its links can be used.
  return (
    <div id="chart-tooltip" role={pinned ? 'dialog' : 'tooltip'} aria-label={content.title} className="tooltip" data-pinned={pinned || undefined}
      ref={ref} style={position} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      {pinned && (
        <div className="tooltip-pin">
          <span>Pinned · click the mark again, outside, or Esc</span>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
      )}
      <strong className="tooltip-title">{content.title}</strong>
      {content.subtitle && <p className="tooltip-subtitle">{content.subtitle}</p>}
      {content.rows && (
        <dl className="tooltip-values">
          {content.rows.map(([label, value, color]) => (
            <div key={label}><dt>{color && <i className="key" style={{ background: color }} />}{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}
      {content.lines?.map((line) => <p key={line}>{line}</p>)}
      {content.table && content.table.rows.length > 0 && <ReadoutTable table={content.table} />}
      {content.note && <p className="tooltip-note">{content.note}</p>}
      {!pinned && <p className="tooltip-hint">Click to pin</p>}
    </div>
  )
}

function ReadoutTable({ table }: { table: TooltipTable }) {
  return (
    <>
      <strong className="tooltip-label">{table.caption}</strong>
      <table className="readout">
        <thead>
          <tr>
            <th scope="col">{table.first}</th>
            {table.columns.map((c) => (
              <th key={c.label} scope="col" data-active={c.active || undefined}>{c.color && <i className="key" style={{ background: c.color }} />}{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.entity ?? row.label} data-total={row.total || undefined}>
              <th scope="row">{row.entity ? <EntityLink name={row.entity} /> : row.label}</th>
              {row.cells.map((cell, i) => <td key={i} data-active={table.columns[i]?.active || undefined}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** Spread the result onto any element (including SVG) to attach the shared tooltip. */
export function useTooltip(content: TooltipContent | null) {
  const api = useContext(Context)
  if (!api) throw new Error('useTooltip outside TooltipProvider')
  if (!content) return {}
  const show = (e: { currentTarget: Element }) => api.show(e.currentTarget, content)
  const toggle = (e: { currentTarget: Element }) => api.toggle(e.currentTarget, content)
  return {
    tabIndex: 0, 'data-tooltip': content.title, role: 'button' as const,
    onPointerEnter: show, onFocus: show, onClick: toggle, onPointerLeave: api.hide, onBlur: api.hide,
    onKeyDown: (e: KeyboardEvent<Element>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e) } },
  }
}
