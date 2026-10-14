// "Verify this record": equivalent focused queries, shown in a modal dialog (centered, so it keeps a centered origin).
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { focusedQueries } from '../data/queries'
import type { Row } from '../data/schema'

const Context = createContext<{ show(kind: string, row: Row): void } | null>(null)
const replacer = (_key: string, value: unknown) => (typeof value === 'bigint' ? value.toString() : value)

export function QueryDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ kind: string; row: Row } | null>(null)
  const ref = useRef<HTMLDialogElement>(null)
  const api = useMemo(() => ({ show: (kind: string, row: Row) => setState({ kind, row }) }), [])
  useEffect(() => {
    if (state && ref.current && !ref.current.open) ref.current.showModal()
  }, [state])
  const text = state
    ? JSON.stringify({
      record: state.row, queries: focusedQueries(state.kind, state.row),
      pagination: 'Follow paging.next_cursor for all V2 list pages. The shown slot query can contain multiple events.',
    }, replacer, 2)
    : ''
  return (
    <Context.Provider value={api}>
      {children}
      <dialog id="query-dialog" ref={ref} aria-labelledby="query-title" onClose={() => setState(null)}
        onClick={(e) => { if (e.target === ref.current) ref.current.close() }}>
        <div className="dialog-head"><h2 id="query-title">Verify this record · API queries</h2><button type="button" className="ghost" onClick={() => ref.current?.close()}>Close · Esc</button></div>
        <div className="dialog-body">
          <p>Equivalent focused queries for this record. The original collection used shared batches and cursor pages; the exact saved requests are in the collection database checkpoint. Click the block to select all of it.</p>
          <pre id="query-text">{text}</pre>
        </div>
      </dialog>
    </Context.Provider>
  )
}

export function useQueryDialog() {
  const api = useContext(Context)
  if (!api) throw new Error('useQueryDialog outside QueryDialogProvider')
  return api
}
