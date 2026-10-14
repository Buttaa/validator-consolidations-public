// Which screen is showing, plus a one-shot "focus" handed to a screen's records grid
// (an entity ranking row, a command-line search, a daily cell). Mirrored in the hash.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { screenById, screenFromHash, type ScreenId } from './commands'

export interface Focus { screen: ScreenId; view?: string; table?: string; search?: string; exact?: Record<string, string>; token: number }
export type FocusRequest = Omit<Focus, 'screen' | 'token'>

interface Nav { screen: ScreenId; token: number; focus: Focus | null; go(screen: ScreenId, focus?: FocusRequest): void }

const Context = createContext<Nav | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ screen: ScreenId; token: number; focus: Focus | null }>(() => ({
    screen: screenFromHash(window.location.hash) || 'deposits', token: 0, focus: null,
  }))
  const go = useCallback((screen: ScreenId, focus?: FocusRequest) => {
    setState((prev) => {
      const token = prev.token + 1
      return { screen, token, focus: focus ? { ...focus, screen, token } : null }
    })
    const hash = '#' + screenById(screen)!.code
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
  }, [])
  useEffect(() => {
    const onPop = () => {
      const screen = screenFromHash(window.location.hash)
      if (screen) setState((prev) => ({ screen, token: prev.token + 1, focus: null }))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => { document.title = `${screenById(state.screen)!.code} · VALIDATOR ACTIVITY` }, [state.screen])
  const value = useMemo<Nav>(() => ({ ...state, go }), [state, go])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useNavigation(): Nav {
  const value = useContext(Context)
  if (!value) throw new Error('useNavigation outside NavigationProvider')
  return value
}

/** The pending focus for one records grid, or null. */
export function useFocus(table: string): Focus | null {
  const nav = useNavigation()
  return nav.focus && nav.focus.table === table ? nav.focus : null
}
