// One terminal screen: heading strip, view tabs (OVERVIEW / RECORDS / … / API), one view mounted at a time.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { QueryCards } from '../components/QueryCards'
import type { ScreenId } from './commands'
import { useNavigation } from './navigation'

export interface View { id: string; label: string; body: ReactNode }

interface Props { id: ScreenId; title: string; description?: ReactNode; chip?: ReactNode; controls?: ReactNode; views: View[]; queries?: string[] }

export function Screen({ id, title, description, chip, controls, views, queries }: Props) {
  const nav = useNavigation()
  const all = queries ? [...views, { id: 'api', label: 'API', body: <QueryCards section={id} names={queries} /> }] : views
  const [active, setActive] = useState(() => (nav.focus?.screen === id && nav.focus.view) || all[0].id)
  const listRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (nav.focus?.screen === id && nav.focus.view) setActive(nav.focus.view) }, [nav.focus, id])
  // Screen changes are keyboard-driven and instant; move focus to the heading so the change is announced.
  useEffect(() => { if (nav.token > 0) headingRef.current?.focus({ preventScroll: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const tabs = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role=tab]') || [])]
    const index = tabs.indexOf(document.activeElement as HTMLButtonElement)
    let next: number
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return
    e.preventDefault()
    tabs[next].focus()
    setActive(all[next].id)
  }
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="screen-head">
        <h1 id={`${id}-title`} ref={headingRef} tabIndex={-1}>{title}</h1>
        {description && <p>{description}</p>}
        {(controls || chip) && <div className="screen-controls">{controls}{chip}</div>}
      </div>
      <div role="tablist" aria-label={`${title} views`} ref={listRef} onKeyDown={onKey}>
        {all.map((v) => (
          <button key={v.id} type="button" role="tab" id={`${id}-tab-${v.id}`} aria-controls={`${id}-${v.id}`}
            aria-selected={active === v.id} tabIndex={active === v.id ? 0 : -1} onClick={() => setActive(v.id)}>{v.label}</button>
        ))}
      </div>
      {all.map((v) => (
        <div key={v.id} role="tabpanel" id={`${id}-${v.id}`} aria-labelledby={`${id}-tab-${v.id}`} hidden={active !== v.id}>
          {active === v.id ? v.body : null}
        </div>
      ))}
    </section>
  )
}
