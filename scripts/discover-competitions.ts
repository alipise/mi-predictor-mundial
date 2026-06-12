/**
 * Discovers available competitions and fixture counts for 2024-2026.
 * Run: pnpm tsx --env-file=.env.local scripts/discover-competitions.ts
 */
const KEY = process.env.RAPIDAPI_KEY ?? ""
const BASE = "https://v3.football.api-sports.io"

const CANDIDATES = [
  { id: 1,   name: "FIFA World Cup",              seasons: [2026] },
  { id: 5,   name: "UEFA Nations League",         seasons: [2024, 2025] },
  { id: 32,  name: "WC Quals — UEFA",             seasons: [2024, 2025] },
  { id: 34,  name: "WC Quals — CONMEBOL",         seasons: [2025, 2026] },
  { id: 31,  name: "WC Quals — CONCACAF",         seasons: [2024, 2025] },
  { id: 30,  name: "WC Quals — AFC",              seasons: [2025, 2026] },
  { id: 29,  name: "WC Quals — CAF",              seasons: [2024, 2025] },
  { id: 33,  name: "WC Quals — OFC",              seasons: [2024, 2025] },
  { id: 10,  name: "Friendlies Internacionales",  seasons: [2025, 2026] },
  { id: 4,   name: "UEFA Euro",                   seasons: [2024] },
  { id: 9,   name: "Copa America",                seasons: [2024] },
  { id: 6,   name: "AFCON",                       seasons: [2024, 2025] },
  { id: 7,   name: "AFC Asian Cup",               seasons: [2023, 2024] },
  { id: 22,  name: "CONCACAF Gold Cup",           seasons: [2023, 2025] },
  { id: 848, name: "CONCACAF Nations League",     seasons: [2024, 2025] },
]

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function checkLeague(id: number, season: number) {
  const res = await fetch(`${BASE}/fixtures?league=${id}&season=${season}`, {
    headers: { "x-apisports-key": KEY },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) return null
  const fixtures: unknown[] = data.response ?? []
  const played = fixtures.filter((f: any) =>
    ["FT", "AET", "PEN"].includes(f.fixture?.status?.short)
  )
  return { total: fixtures.length, played: played.length }
}

async function main() {
  console.log("Discovering competitions (2024-2026)...\n")
  const results: Array<{ league: number; season: number; name: string; total: number; played: number }> = []

  for (const comp of CANDIDATES) {
    for (const season of comp.seasons) {
      const r = await checkLeague(comp.id, season)
      if (r && r.total > 0) {
        results.push({ league: comp.id, season, name: comp.name, ...r })
        console.log(`  ✓ L=${comp.id} S=${season} | ${r.played}/${r.total} jugados | ${comp.name}`)
      }
      await sleep(300)
    }
  }

  console.log("\n=== RESUMEN ===")
  console.log(`Total competiciones con datos: ${results.length}`)
  console.log(`Total fixtures jugados: ${results.reduce((a, r) => a + r.played, 0)}`)
}

main().catch(console.error)
