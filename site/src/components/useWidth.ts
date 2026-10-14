// Charts draw in CSS pixels at their container's width, so 11px labels stay 11px in any panel.
import { useLayoutEffect, useRef, useState } from 'react'

export function useWidth(initial = 960) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(initial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, Math.floor(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}
