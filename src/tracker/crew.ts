import { qs } from '../shared/dom'

interface CrewResponse {
  count: number
  names: string[]
}

export async function initCrewCard(): Promise<void> {
  const statusEl = qs<HTMLElement>('#crew-status')
  const listEl = qs<HTMLUListElement>('#crew-list')
  const countEl = qs<HTMLElement>('#crew-count')

  try {
    const res = await fetch('/api/crew')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as CrewResponse

    countEl.textContent = String(data.count)
    listEl.innerHTML = ''
    for (const name of data.names) {
      const li = document.createElement('li')
      li.textContent = name
      listEl.appendChild(li)
    }
    listEl.hidden = false
    statusEl.hidden = true
  } catch {
    statusEl.textContent = 'Crew roster unavailable right now.'
  }
}
