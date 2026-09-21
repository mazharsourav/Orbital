export function getParam(name: string): string | null {
  return new URL(window.location.href).searchParams.get(name)
}

export function setParams(updates: Record<string, string | null>): void {
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  }
  window.history.replaceState(null, '', url)
}
