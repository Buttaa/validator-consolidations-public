// API lineage for a screen: method, endpoint, saved example body, fields used and reuse rules.
import type { CSSProperties } from 'react'
import { endpointFamily } from '../data/queries'
import { useSelection } from '../state'

export function QueryCards({ section, names }: { section: string; names: string[] }) {
  const { summary } = useSelection()
  const stats = new Map(summary.query_stats.map((s) => [s.path, s]))
  return (
    <div className="grid">
      <p className="note" style={{ gridColumn: '1 / -1', marginTop: 0 }}>All queries use <code>https://beaconcha.in</code>. Authentication is supplied privately in the Authorization header. POST bodies are JSON. Examples are saved requests; validator batches and page cursors vary across the full collection. Every cached request and its raw-response path is retained in the collection database checkpoint (<code>data/manifest.json</code>). Changing a chart, range or credential mode makes zero API calls.</p>
      {names.map((name) => {
        const q = summary.queries[name]
        if (!q) return null
        const stat = stats.get(endpointFamily(q.url))
        const attempts = stat?.attempts || 0
        const seconds = stat?.request_seconds || 0
        const payload = q.body != null ? JSON.stringify(q.body, null, 2) : ''
        return (
          <article className="query-card panel" key={section + name} style={{ '--span': 6 } as CSSProperties}>
            <h3>{name.replace(/_/g, ' ')}</h3>
            <div className="body">
              <p>{q.rule}</p>
              <p><b>Fields used:</b> {q.fields}</p>
              <details>
                <summary>{q.example_origin || 'Equivalent request example'}</summary>
                <pre>{q.method + ' ' + q.url + (payload ? '\n' + payload : '')}</pre>
              </details>
              <p className="note">
                {attempts.toLocaleString('en-US')} logged attempts for this endpoint family, including retries and checks · mean {(attempts ? seconds / attempts : 0).toFixed(2)}s per request · ideal rate-limit floor {(attempts / 9.52 / 60).toFixed(1)} min with both keys (not elapsed time).
                {' '}<a href={q.docs} target="_blank" rel="noopener noreferrer">Documentation ↗</a>
              </p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
