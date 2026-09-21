import './style.css'
import { qs } from './shared/dom'
import { initThemeToggle } from './shared/theme'
import { getParam, setParams } from './shared/url'
import { initTracker } from './tracker/tracker'
import { initGallery } from './gallery/gallery'

type ViewName = 'tracker' | 'gallery'

function switchView(view: ViewName): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tab')
  tabs.forEach((tab) => {
    const active = tab.dataset.view === view
    tab.classList.toggle('active', active)
    // aria-selected is only valid ARIA on an element with role="tab" — the footer's
    // "Explore" buttons share the .tab class for behavior but aren't real tabs
    if (tab.getAttribute('role') === 'tab') {
      tab.setAttribute('aria-selected', String(active))
    }
  })

  qs<HTMLElement>('#view-tracker').classList.toggle('active', view === 'tracker')
  qs<HTMLElement>('#view-tracker').hidden = view !== 'tracker'
  qs<HTMLElement>('#view-gallery').classList.toggle('active', view === 'gallery')
  qs<HTMLElement>('#view-gallery').hidden = view !== 'gallery'

  if (view === 'tracker') {
    setParams({ view: null, date: null })
  } else {
    setParams({ view })
    initGallery()
  }
}

function wireViewSwitcher(): void {
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view as ViewName
      switchView(view)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  })
}

wireViewSwitcher()
initThemeToggle()
initTracker()

if (getParam('view') === 'gallery') switchView('gallery')
