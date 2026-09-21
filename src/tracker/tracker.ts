import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { IssPosition } from './types'
import { qs } from '../shared/dom'
import { getEffectiveTheme, onThemeChange, type EffectiveTheme } from '../shared/theme'
import { initCrewCard } from './crew'

const ISS_ENDPOINT = 'https://api.wheretheiss.at/v1/satellites/25544'
const POLL_INTERVAL_MS = 4000
const MAX_TRAIL_POINTS = 55

const TILE_URLS: Record<EffectiveTheme, string> = {
  dark: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  light: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
}

// labels/roads overlay stacked on top of the base tiles above, for a more readable map
const REFERENCE_URLS: Record<EffectiveTheme, string> = {
  dark: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  light: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
}

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS, and the GIS community'

const TRAIL_COLORS: Record<EffectiveTheme, string> = {
  dark: '#FF9F1C',
  light: '#F2900C',
}

let map: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let referenceLayer: L.TileLayer | null = null
let marker: L.Marker | null = null
let trail: L.Polyline | null = null
let trailPoints: L.LatLngExpression[] = []

function setMapTheme(theme: EffectiveTheme): void {
  if (!map) return
  if (tileLayer) map.removeLayer(tileLayer)
  if (referenceLayer) map.removeLayer(referenceLayer)
  tileLayer = L.tileLayer(TILE_URLS[theme], {
    attribution: TILE_ATTRIBUTION,
    maxZoom: 16,
  }).addTo(map)
  referenceLayer = L.tileLayer(REFERENCE_URLS[theme], { maxZoom: 16 }).addTo(map)
  trail?.setStyle({ color: TRAIL_COLORS[theme] })
}

function issIcon(): L.DivIcon {
  return L.divIcon({
    className: 'iss-marker',
    html: '<span class="iss-dot"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function setStatus(ok: boolean, message: string): void {
  const dot = qs<HTMLElement>('#status-dot')
  const text = qs<HTMLElement>('#status-text')
  const tabPulse = qs<HTMLElement>('#tracker-pulse')
  text.textContent = message
  dot.classList.toggle('ok', ok)
  dot.classList.toggle('lost', !ok)
  tabPulse.classList.toggle('ok', ok)
  tabPulse.classList.toggle('lost', !ok)
}

function flicker(el: HTMLElement): void {
  el.classList.remove('flicker')
  void el.offsetWidth // force reflow so the animation can retrigger
  el.classList.add('flicker')
}

function setReadout(id: string, value: string): void {
  const el = qs<HTMLElement>(`#${id}`)
  el.textContent = value
  flicker(el)
}

function renderPosition(pos: IssPosition): void {
  if (!marker || !trail) return

  const latLng: L.LatLngExpression = [pos.latitude, pos.longitude]
  marker.setLatLng(latLng)

  trailPoints.push(latLng)
  if (trailPoints.length > MAX_TRAIL_POINTS) trailPoints.shift()
  trail.setLatLngs(trailPoints)

  setReadout('tm-lat', `${pos.latitude.toFixed(4)}°`)
  setReadout('tm-lon', `${pos.longitude.toFixed(4)}°`)
  setReadout('tm-alt', `${pos.altitude.toFixed(1)} km`)
  setReadout('tm-vel', `${pos.velocity.toFixed(0)} km/h`)
  setReadout('tm-vis', pos.visibility === 'daylight' ? 'Daylight' : 'Eclipsed')

  setStatus(true, 'Signal locked')
}

async function pollPosition(): Promise<void> {
  try {
    const res = await fetch(ISS_ENDPOINT)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const pos = (await res.json()) as IssPosition
    renderPosition(pos)
  } catch {
    setStatus(false, 'Signal lost — retrying')
  }
}

function wireZoomButtons(): void {
  qs<HTMLButtonElement>('#tracker-zoom-in').addEventListener('click', () => map?.zoomIn())
  qs<HTMLButtonElement>('#tracker-zoom-out').addEventListener('click', () => map?.zoomOut())
}

function wireRecenterButton(): void {
  qs<HTMLButtonElement>('#tracker-recenter').addEventListener('click', () => {
    if (map && marker) map.panTo(marker.getLatLng(), { animate: true })
  })
}

function wireRefreshButton(): void {
  qs<HTMLButtonElement>('#tracker-refresh').addEventListener('click', () => void pollPosition())
}

export function initTracker(): void {
  if (map) return

  map = L.map('map', {
    center: [20, 0],
    zoom: 3,
    worldCopyJump: true,
    zoomControl: false,
    scrollWheelZoom: false,
  })

  marker = L.marker([20, 0], { icon: issIcon() }).addTo(map)
  trail = L.polyline([], { weight: 2, opacity: 0.55 }).addTo(map)

  setMapTheme(getEffectiveTheme())
  onThemeChange(setMapTheme)

  wireZoomButtons()
  wireRecenterButton()
  wireRefreshButton()
  void pollPosition()
  window.setInterval(() => void pollPosition(), POLL_INTERVAL_MS)

  void initCrewCard()
}
