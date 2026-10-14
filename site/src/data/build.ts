// A tab keeps running the JavaScript it was opened with, so the "reload" link first asks the server which bundle
// the page names now. When that differs from the running one, the whole page reloads instead of only the data.

/** Hashed entry bundles named in HTML or script URLs, e.g. "assets/index-O2i920i-.js", sorted. */
export function bundlesIn(text: string): string[] {
  return [...text.matchAll(/assets\/index-[\w-]+\.js/g)].map((m) => m[0]).sort()
}

/** True when the served page names other bundles than the ones this tab runs. False when unsure (dev server, offline). */
export async function newerBuildAvailable(): Promise<boolean> {
  const running = bundlesIn([...document.scripts].map((s) => s.src).join(' '))
  if (!running.length) return false
  try {
    const response = await fetch(new URL('./', window.location.href).href, { cache: 'no-store' })
    if (!response.ok) return false
    const served = bundlesIn(await response.text())
    return served.length > 0 && served.join(' ') !== running.join(' ')
  } catch {
    return false
  }
}
