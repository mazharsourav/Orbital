import type { ApodEntry } from './types'
import { qs } from '../shared/dom'
import { getParam, setParams } from '../shared/url'

const APOD_ENDPOINT = 'https://api.nasa.gov/planetary/apod'
const APOD_START_DATE = '1995-06-16'
const THUMB_STRIP_DAYS = 7
const FAVORITES_KEY = 'orbital-favorites'

class RateLimitError extends Error {}

// falls back to NASA's shared demo key so a fresh clone (or a deploy without the env var) still works
const apiKey = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'

let currentDate = todayStr()
let initialized = false

function todayStr(): string {
  return formatDate(new Date())
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(dateStr: string, delta: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + delta)
  return formatDate(date)
}

function clamp(dateStr: string): string {
  const today = todayStr()
  if (dateStr < APOD_START_DATE) return APOD_START_DATE
  if (dateStr > today) return today
  return dateStr
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function getFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveFavorites(favs: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]))
  } catch {
    // localStorage unavailable (private browsing, etc.) — favorites just won't persist
  }
}

async function fetchApod(date: string): Promise<ApodEntry> {
  const url = new URL(APOD_ENDPOINT)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('date', date)
  const res = await fetch(url)
  if (res.status === 429) throw new RateLimitError(`HTTP ${res.status}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as ApodEntry
}

async function fetchApodRange(start: string, end: string): Promise<ApodEntry[]> {
  const url = new URL(APOD_ENDPOINT)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('start_date', start)
  url.searchParams.set('end_date', end)
  url.searchParams.set('thumbs', 'true')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as ApodEntry[]
}

function setStatus(message: string | null): void {
  const statusEl = qs<HTMLElement>('#gallery-status')
  const card = qs<HTMLElement>('#gallery-card')
  if (message) {
    statusEl.textContent = message
    statusEl.hidden = false
    card.hidden = true
  } else {
    statusEl.hidden = true
    card.hidden = false
  }
}

function updateFavoriteButton(date: string): void {
  const btn = qs<HTMLButtonElement>('#gallery-fav')
  const isFav = getFavorites().has(date)
  btn.classList.toggle('active', isFav)
  btn.setAttribute('aria-pressed', String(isFav))
}

function renderEntry(entry: ApodEntry): void {
  const mediaEl = qs<HTMLElement>('#gallery-media')
  mediaEl.innerHTML = ''

  if (entry.media_type === 'video') {
    const iframe = document.createElement('iframe')
    iframe.src = entry.url
    iframe.title = entry.title
    iframe.allowFullscreen = true
    mediaEl.appendChild(iframe)
  } else {
    const img = document.createElement('img')
    img.src = entry.hdurl ?? entry.url
    img.alt = entry.title
    mediaEl.appendChild(img)
  }

  qs<HTMLElement>('#gallery-title').textContent = entry.title
  qs<HTMLElement>('#gallery-explanation').textContent = entry.explanation

  const metaParts = [formatDisplayDate(entry.date)]
  if (entry.copyright) metaParts.push(`© ${entry.copyright.trim()}`)
  qs<HTMLElement>('#gallery-meta').textContent = metaParts.join(' · ')

  qs<HTMLInputElement>('#gallery-date').value = entry.date

  updateFavoriteButton(entry.date)
  setParams({ date: entry.date })
  highlightThumb(entry.date)
  setStatus(null)
}

function highlightThumb(date: string): void {
  const strip = qs<HTMLElement>('#thumb-strip')
  strip.querySelectorAll<HTMLButtonElement>('.thumb').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.date === date)
  })
}

async function loadDate(date: string, options: { allowTodayFallback?: boolean } = {}): Promise<void> {
  const { allowTodayFallback = false } = options
  currentDate = date
  setStatus('Loading transmission…')

  try {
    const entry = await fetchApod(date)
    renderEntry(entry)
  } catch (err) {
    if (err instanceof RateLimitError) {
      // retrying against an exhausted quota would just burn another request for nothing
      setStatus('NASA API rate limit reached — wait a bit and try again, or add your own API key (see README).')
      return
    }
    if (allowTodayFallback) {
      await loadDate(addDays(date, -1), { allowTodayFallback: false })
      return
    }
    setStatus('Could not reach the archive for this date. Try another day.')
  }
}

function renderThumbnails(entries: ApodEntry[]): void {
  const strip = qs<HTMLElement>('#thumb-strip')
  strip.innerHTML = ''

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))

  for (const entry of sorted) {
    const thumb = document.createElement('button')
    thumb.type = 'button'
    thumb.className = 'thumb'
    thumb.dataset.date = entry.date
    thumb.setAttribute('aria-label', `${entry.title} — ${entry.date}`)

    const thumbSrc = entry.thumbnail_url ?? (entry.media_type === 'image' ? entry.url : '')
    if (thumbSrc) {
      const img = document.createElement('img')
      img.src = thumbSrc
      img.alt = ''
      thumb.appendChild(img)
    }

    thumb.addEventListener('click', () => {
      void loadDate(entry.date)
      highlightThumb(entry.date)
    })

    strip.appendChild(thumb)
  }

  highlightThumb(currentDate)
}

async function loadThumbStrip(): Promise<void> {
  const end = todayStr()
  const start = clamp(addDays(end, -(THUMB_STRIP_DAYS - 1)))
  try {
    const entries = await fetchApodRange(start, end)
    renderThumbnails(entries)
  } catch {
    // thumbnail strip is supplementary — a failure here shouldn't block the main view
  }
}

function goToDate(next: string): void {
  const clamped = clamp(next)
  void loadDate(clamped)
  highlightThumb(clamped)
}

function wireControls(): void {
  const dateInput = qs<HTMLInputElement>('#gallery-date')
  dateInput.min = APOD_START_DATE
  dateInput.max = todayStr()

  qs<HTMLButtonElement>('#gallery-prev').addEventListener('click', () => {
    goToDate(addDays(currentDate, -1))
  })

  qs<HTMLButtonElement>('#gallery-next').addEventListener('click', () => {
    goToDate(addDays(currentDate, 1))
  })

  dateInput.addEventListener('change', () => {
    goToDate(dateInput.value || todayStr())
  })

  qs<HTMLButtonElement>('#gallery-fav').addEventListener('click', () => {
    const favs = getFavorites()
    if (favs.has(currentDate)) {
      favs.delete(currentDate)
    } else {
      favs.add(currentDate)
    }
    saveFavorites(favs)
    updateFavoriteButton(currentDate)
  })
}

function isValidDateParam(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function initGallery(): void {
  if (initialized) return
  initialized = true

  wireControls()

  const urlDate = getParam('date')
  if (isValidDateParam(urlDate)) {
    void loadDate(clamp(urlDate))
  } else {
    void loadDate(todayStr(), { allowTodayFallback: true })
  }
  void loadThumbStrip()
}
