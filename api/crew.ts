// Vercel serverless function. Runs server-side, so it can reach Open Notify's
// HTTP-only astros.json — a browser on our HTTPS site would have that blocked
// as mixed content. Only works when deployed on Vercel (or via `vercel dev`
// locally) — plain `npm run dev` has no server to host this route.

interface AstroPerson {
  craft: string
  name: string
}

interface AstrosResponse {
  people: AstroPerson[]
}

export default async function handler(req: unknown, res: {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}): Promise<void> {
  try {
    const upstream = await fetch('http://api.open-notify.org/astros.json')
    if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`)

    const data = (await upstream.json()) as AstrosResponse
    const issCrew = data.people.filter((person) => person.craft === 'ISS')

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ count: issCrew.length, names: issCrew.map((p) => p.name) })
  } catch {
    res.status(502).json({ error: 'Could not reach crew data source' })
  }
}
