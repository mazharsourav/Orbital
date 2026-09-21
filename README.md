# Orbital

A live ISS tracker and a NASA Astronomy Picture of the Day (APOD) browser on one page, switched by a tab in the header. Built as a one-day portfolio project.

**Live demo: [orbital-beta-green.vercel.app](https://orbital-beta-green.vercel.app/)** — deployed on Vercel, so everything works there, including the live crew roster of who's currently aboard the ISS.

## Features

### Live Tracker
- A map centered on the ISS's real-time position, polled every 4 seconds from [wheretheiss.at](https://wheretheiss.at) (no API key needed).
- A rolling trail of the last ~55 positions (roughly the last 3–4 minutes), and a telemetry panel with latitude, longitude, altitude, velocity, and day/night visibility.
- A live-signal indicator (pulses while polling succeeds, dims and shows "Signal lost — retrying" on a failed poll) — mirrored as a small dot next to the "Live Tracker" tab.
- Manual **zoom in / zoom out**, **recenter on ISS** (in case you've panned away), and **refresh now** controls in the map card header. Scroll-wheel zoom is disabled on purpose, so scrolling the page over the map scrolls the page instead of zooming the map.
- The basemap swaps between light/dark Esri tile sets depending on the active theme, plus a CSS filter that tints the tiles toward the app's navy/sky-blue palette instead of leaving them neutral gray.
- A **crew card** below the map showing who's currently aboard the ISS (live headcount + names), via a small serverless proxy. It's live on the [deployed site](https://orbital-beta-green.vercel.app/) — see [Crew data](#crew-data) below for why it needs Vercel.

### Daily Image (APOD)
- Browse NASA's APOD archive by date, back to **1995-06-16**.
- Prev/next-day navigation and a direct date picker, both clamped to the valid range.
- A thumbnail strip of the last 7 days for quick browsing (fetched once per gallery visit).
- A favorite/star toggle per date, persisted in `localStorage`.
- If today's APOD isn't published yet, it silently retries with yesterday's date and updates the picker to match.
- If the NASA API rate-limits a request (HTTP 429), it shows a specific "rate limit reached" message instead of a generic error, and skips any pointless fallback retry against the same exhausted quota.
- The current view and gallery date are reflected in the URL (`?view=gallery&date=YYYY-MM-DD`), so a specific day is bookmarkable and shareable — reloading or opening that link lands directly on it.

### Theme
- Three-way **light / dark / system** toggle in the navbar, persisted in `localStorage`. "System" follows the OS setting live, including if it changes while the tab is open.
- No flash on load: a tiny inline script in `<head>` applies a saved explicit choice before first paint.
- Light mode reads as an actual daytime sky (soft blue background, a gentle glow instead of stars); dark mode is a deep night-navy palette with a twinkling starfield.
- The navbar pill intentionally inverts against the page — a dark bar on the light theme, a light bar on the dark theme — so it always contrasts with the page instead of blending into it.

### Design
- A floating, rounded, shadowed navbar pill (logo badge that spins on hover, centered tabs, theme toggle) and a matching rounded-card footer with social links, explore links, and data-source links.
- The map card, crew card, and both gallery cards (image + caption) share the same rounded/shadowed card language and adapt to the active theme automatically.

## Crew data

The only free API for ISS crew ([Open Notify's `astros.json`](http://api.open-notify.org/astros.json)) is HTTP-only, which any HTTPS site — including this one — blocks client-side as mixed content. `api/crew.ts` is a small **Vercel serverless function** that fetches it server-side and returns just the ISS-craft entries as JSON, sidestepping that block. It needs no API key or env vars.

**On the [live deployment](https://orbital-beta-green.vercel.app/), the crew card shows the real headcount and each crew member's name.** The function's response is cached at Vercel's edge for 5 minutes, so repeat visits don't hit Open Notify every time.

Locally, the crew card only shows real data via `vercel dev` (see below). Under plain `npm run dev`, it shows its "unavailable" fallback state, which is expected, not a bug.

## Stack

- **Vite + vanilla TypeScript** — no UI framework.
- **Leaflet.js** for the map, with Esri's keyless raster basemaps.
- One **Vercel serverless function** (`api/crew.ts`) for the crew roster proxy — everything else is a static build.

## Project structure

```
index.html
package.json / tsconfig.json
.env.local / .env.example
/api
  crew.ts            serverless function — proxies Open Notify's crew data
/public
  favicon.svg
/src
  main.ts            entry point — view switching, theme init
  style.css           design tokens + all styling
  vite-env.d.ts
  /tracker
    tracker.ts         map, polling, trail, telemetry, zoom/recenter/refresh
    crew.ts            fetches /api/crew and renders the crew card
    types.ts
  /gallery
    gallery.ts         date state, fetch, render, thumbnails, favorites
    types.ts
  /shared
    dom.ts             qs() helper
    theme.ts           light/dark/system logic
    url.ts             query-param read/write helpers
```

## Setup

```bash
npm install
```

Get a free NASA API key at [api.nasa.gov](https://api.nasa.gov) (instant signup, 1,000 requests/hour vs. the shared `DEMO_KEY`'s 30/hour, 50/day). Copy `.env.example` to `.env.local` and set your key:

```
VITE_NASA_API_KEY=your_key_here
```

`.env.local` is gitignored. If `VITE_NASA_API_KEY` isn't set at all, the app falls back to `DEMO_KEY`, so `npm run dev` works out of the box — but you'll hit its rate limit fast while iterating on the gallery.

```bash
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

## Deploying

The project is live at **[orbital-beta-green.vercel.app](https://orbital-beta-green.vercel.app/)**, deployed from this repo's `main` branch.

**Vercel is required** for the crew card to show live data (see [Crew data](#crew-data)). The tracker and gallery are plain static output and would work on any static host (Netlify, GitHub Pages, etc.), but the crew card would show its fallback state there without an equivalent serverless function.

To deploy your own copy: import the repo into Vercel (it auto-detects Vite — no config file needed) and set `VITE_NASA_API_KEY` as a project environment variable. Vite inlines it into the build at build time. `api/crew.ts` needs no env vars of its own.

**Local dev note:** `npm run dev` (plain Vite) does not run `api/crew.ts` as a server function — it just serves the raw source file, so the crew card shows its fallback locally by design. To actually see it working before deploying, use `vercel dev` instead (requires the Vercel CLI and `vercel link`).

## Known limitations

- **The live demo runs on NASA's shared `DEMO_KEY`** (roughly 30 requests/hour, shared across all visitors). If the Daily Image tab shows "rate limit reached", the quota is used up for the hour — it resets on its own. The Live Tracker and crew card don't use the NASA key and are unaffected.
- **The NASA API key is visible client-side.** This is a static site with no backend for it, so the key ships in the bundled JS and is visible in the browser's network tab to anyone who looks — inherent to a client-only architecture, not an oversight. The key itself is low-stakes (free, rate-limited, no billing or data access); `.env.local` only keeps it out of git history, not out of the browser.
- **The ISS trail isn't unwrapped across the antimeridian (the 180° line).** On the rare poll where the ISS crosses it, the trail may draw a stray line across the map.
- **The crew card only shows a live headcount and names**, not how long each person has been aboard — `astros.json` doesn't include arrival dates, and no free API tracking per-astronaut time in space was found. (The API also appears infrequently updated — crew names were noticeably stale as of this writing.)
- **The thumbnail strip is fetched once** when the gallery is first opened (last 7 days from that moment) and doesn't refresh if the tab is left open across a day boundary.
- **Gallery URL updates use `history.replaceState`**, not `pushState` — dates and views are bookmarkable/shareable, but browser back/forward won't step through them individually.
