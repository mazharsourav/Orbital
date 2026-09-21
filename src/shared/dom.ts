export function qs<T extends HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector)
  if (!el) throw new Error(`Missing element: ${selector}`)
  return el
}
