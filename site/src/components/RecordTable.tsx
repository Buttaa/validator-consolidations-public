// Every saved entry in a virtualised grid: search, filtered CSV, cursor selection with a detail
// pane, and the equivalent API queries for the selected row. Pagination is gone; scroll instead.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { TableVirtuoso, type ListRange, type TableComponents, type TableVirtuosoHandle } from 'react-virtuoso'
import { eth, exactEth } from '../data/eth'
import { rowMatches, searchWords } from '../data/search'
import type { Row } from '../data/schema'
import { useFocus } from '../terminal/navigation'
import { PUBLIC_ROWS } from '../data/public'
import { CredentialBadge, Eth, ExplorerLink, Linked, MoreRows } from './basics'
import { columns, primary, type Format } from './columns'
import { useQueryDialog } from './QueryDialog'

interface Props {
  kind: string
  rows: Row[]
  status?: ReactNode
  action?: { label: string; run(row: Row): void } | null
  tools?: ReactNode
  busy?: boolean
  height?: number
}

const LINKS: Format[] = ['validator', 'slot', 'epoch', 'tx', 'block']

export function display(value: unknown, format?: Format): string {
  if (value === null || value === undefined) return '—'
  if (format === 'eth') return eth(value as string)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value).replaceAll('compounding_switch', 'Compounding switch').replaceAll('top_up', 'Top-up').replaceAll('not_collected', 'Not collected')
}

function Cell({ value, format, column, full }: { value: unknown; format?: Format; column: string; full?: boolean }) {
  if (value !== null && value !== undefined && LINKS.includes(format)) return <ExplorerLink kind={format as string} value={value as string | number} full={full} />
  if (format === 'eth') return <Eth wei={value as string | null} />
  if (['chart_prefix', 'prefix'].includes(column) && typeof value === 'string') return <CredentialBadge value={value} />
  if (typeof value === 'string' && value.length > 0 && !['status', 'type', 'basis', 'roles', 'state', 'kind', 'reason', 'finality'].includes(column)) {
    return <Linked value={value} column={column} full={full} />
  }
  return <>{display(value, format)}</>
}

const csvValue = (v: unknown) => {
  const text = String(v ?? '')
  return '"' + (/^\s*[=+\-@]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"'
}

const numericValue = (v: unknown) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && /^[\d.,\s]+%?$/.test(v))

interface Ctx { selected: number; select(index: number): void }

const components: TableComponents<Row, Ctx> = {
  Table: ({ style, ...props }) => <table {...props} style={{ ...style, width: '100%' }} />,
  TableRow: ({ item, context, ...props }) => {
    void item
    const index = props['data-index']
    const selected = context?.selected === index
    return <tr {...props} aria-selected={selected} onClick={() => context?.select(selected ? -1 : index)} />
  },
}

export function RecordTable({ kind, rows: allRows, status, action, tools, busy, height = 460 }: Props) {
  // Search and CSV only ever see the rows the public snapshot shows.
  const rows = useMemo(() => allRows.slice(0, PUBLIC_ROWS), [allRows])
  const schema = columns[kind]
  const shown = primary[kind].map((key) => schema.find((c) => c[0] === key)!)
  const dialog = useQueryDialog()
  const focus = useFocus(kind)
  const grid = useRef<TableVirtuosoHandle>(null)
  const visible = useRef<ListRange>({ startIndex: 0, endIndex: 0 })
  const [search, setSearch] = useState(focus?.search || '')
  const [exact, setExact] = useState<Record<string, string> | null>(focus?.exact || null)
  const [selected, setSelected] = useState(-1)
  // Mirror of `selected` for key repeat: several keydowns can land before React re-renders.
  const cursor = useRef(-1)
  const select = (index: number) => { cursor.current = index; setSelected(index) }
  useEffect(() => {
    if (!focus) return
    setSearch(focus.search || '')
    setExact(focus.exact || null)
    select(-1)
    grid.current?.scrollToIndex(0)
  }, [focus?.token]) // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => {
    const words = searchWords(search)
    return rows.filter((row) => {
      if (exact && Object.entries(exact).some(([k, v]) => String(row[k]) !== v)) return false
      return rowMatches(row, words)
    })
  }, [rows, search, exact])
  const numeric = useMemo(() => Object.fromEntries(shown.map(([key, , format]) =>
    [key, format === 'eth' || rows.slice(0, 50).some((r) => numericValue(r[key]))])), [shown, rows])
  const hasWei = schema.some((c) => c[0] === 'wei')
  const sum = hasWei ? filtered.reduce((s, r) => s + BigInt((r.wei as string) || 0), 0n) : null
  const row = selected >= 0 && selected < filtered.length ? filtered[selected] : undefined
  const act = action === null ? null : action || { label: 'API queries', run: (r: Row) => dialog.show(kind, r) }
  const context = useMemo<Ctx>(() => ({ selected, select }), [selected]) // eslint-disable-line react-hooks/exhaustive-deps
  const move = (next: number) => {
    const index = Math.max(0, Math.min(filtered.length - 1, next))
    select(index)
    const { startIndex, endIndex } = visible.current
    if (index <= startIndex) grid.current?.scrollToIndex({ index, align: 'start' })
    else if (index >= endIndex) grid.current?.scrollToIndex({ index, align: 'end' })
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!filtered.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); move(cursor.current + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(cursor.current - 1) }
    else if (e.key === 'PageDown') { e.preventDefault(); move(cursor.current + 15) }
    else if (e.key === 'PageUp') { e.preventDefault(); move(cursor.current - 15) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(filtered.length - 1) }
    else if (e.key === 'Enter' && row && act) { e.preventDefault(); act.run(row) }
    else if (e.key === 'Escape') select(-1)
  }
  const downloadCsv = () => {
    const lines = [schema.map((c) => csvValue(c[1])).join(',')]
    for (const r of filtered) lines.push(schema.map(([key, , format]) => csvValue(format === 'eth' && r[key] != null ? exactEth(r[key] as string).replaceAll(' ', '') : display(r[key], format))).join(','))
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = kind + '-filtered.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className={clsx('records', row && 'has-detail')} data-records={kind}>
      <div className="records-tools">
        <input type="search" aria-label={`Search ${kind} records`} placeholder="Search entity, validator, date, transaction…" value={search}
          onChange={(e) => { setSearch(e.target.value); setExact(null); select(-1) }} />
        {tools}
        <button type="button" onClick={downloadCsv} disabled={!filtered.length}>CSV · filtered</button>
      </div>
      <div className="records-meta" role="status">
        <span><b>{filtered.length.toLocaleString('en-US')}</b> / {rows.length.toLocaleString('en-US')} entries shown</span>
        {sum !== null && <span><b>{eth(sum)}</b> ETH in matching rows</span>}
        {exact && <span className="amber">Exact filter · edit the search to clear</span>}
        {status && <span>{status}</span>}
        <span className="dim">↑↓ PgUp PgDn select · Enter {act ? act.label.toLowerCase() : 'detail'} · Esc clear</span>
      </div>
      <div className="records-grid" data-busy={busy || undefined} style={{ '--grid-h': Math.min(height, 40 + filtered.length * 24) + 'px' } as CSSProperties} tabIndex={0} onKeyDown={onKey}
        role="group" aria-label={`${kind} records grid`} aria-busy={busy || undefined}>
        {busy && <div className="busy-bar" role="presentation" />}
        {filtered.length ? (
          <TableVirtuoso<Row, Ctx> ref={grid} data={filtered} context={context} components={components} rangeChanged={(r) => { visible.current = r }}
            fixedHeaderContent={() => <tr>{shown.map(([key, title]) => <th key={key} scope="col" className={clsx(numeric[key] && 'num')}>{title}</th>)}</tr>}
            itemContent={(_index, r) => shown.map(([key, , format]) => (
              <td key={key} className={clsx(numeric[key] && 'num', key === 'entity' && 'entity')} title={typeof r[key] === 'string' ? (r[key] as string) : undefined}>
                <Cell value={r[key]} format={format} column={key} />
              </td>
            ))} />
        ) : <p className="empty" style={{ padding: 12 }}>No entries match these filters.</p>}
      </div>
      <MoreRows total={allRows.length} />
      {row && (
        <div className="record-detail">
          <dl>
            {schema.map(([key, title, format]) => (
              <div key={key}><dt>{title}</dt><dd><Cell value={row[key]} format={format} column={key} full /></dd></div>
            ))}
          </dl>
          <div className="actions">
            {act && <button type="button" className="primary" onClick={() => act.run(row)}>{act.label}</button>}
            <button type="button" className="ghost" onClick={() => select(-1)}>Close · Esc</button>
          </div>
        </div>
      )}
    </div>
  )
}
