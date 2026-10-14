import { useRef, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'

export function Panel({ title, tools, span = 12, note, flush, children }: {
  title: ReactNode; tools?: ReactNode; span?: number; note?: ReactNode; flush?: boolean; children: ReactNode
}) {
  return (
    <section className="panel" style={{ '--span': span } as CSSProperties}>
      <header className="panel-head"><h2>{title}</h2>{tools && <div className="panel-tools">{tools}</div>}</header>
      <div className={clsx('panel-body', flush && 'flush')}>{children}{note && <p className="note">{note}</p>}</div>
    </section>
  )
}

export interface TileItem { label: string; value: string; small?: ReactNode; tone?: 'red' | 'green' | 'amber' }

/** Metric tiles. A value that changes after first paint re-mounts and fades from amber to white (colour only). */
export function Tiles({ items }: { items: TileItem[] }) {
  return <div className="tiles">{items.map((item) => <Tile key={item.label} {...item} />)}</div>
}

function Tile({ label, value, small, tone }: TileItem) {
  const initial = useRef(value)
  return (
    <div className="tile">
      <div className="tile-label" title={label}>{label}</div>
      <strong key={value === initial.current ? 'first' : value} className={clsx('tile-value', tone)}>{value}</strong>
      {small && <div className="tile-small">{small}</div>}
    </div>
  )
}
