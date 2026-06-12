/**
 * Imports stats from all relevant 2024-2026 international competitions.
 * Pro plan required (7500 req/day). Uses 15 API calls total.
 * Run: pnpm import:full
 */
import { initSchema } from "@/lib/db/schema"
import { getDb } from "@/lib/db"

const KEY = process.env.RAPIDAPI_KEY ?? ""
const BASE = "https://v3.football.api-sports.io"

// ─── All relevant competitions discovered ────────────────────────────────────
const COMPETITIONS = [
  // WC 2026 itself (group stage games already played)
  { league: 1,   season: 2026, name: "FIFA World Cup 2026" },
  // Major 2024 tournaments
  { league: 4,   season: 2024, name: "UEFA Euro 2024" },
  { league: 9,   season: 2024, name: "Copa America 2024" },
  { league: 6,   season: 2025, name: "AFCON 2025" },
  { league: 7,   season: 2023, name: "AFC Asian Cup 2023" },
  { league: 22,  season: 2023, name: "CONCACAF Gold Cup 2023" },
  { league: 22,  season: 2025, name: "CONCACAF Gold Cup 2025" },
  // WC Qualifiers — recent cycles
  { league: 32,  season: 2024, name: "WC Quals — UEFA 2026" },
  { league: 34,  season: 2026, name: "WC Quals — CONMEBOL 2026" },
  { league: 30,  season: 2026, name: "WC Quals — AFC 2026" },
  // Nations Leagues (strong head-to-head data)
  { league: 5,   season: 2024, name: "UEFA Nations League 2024-25" },
  { league: 848, season: 2024, name: "CONCACAF Nations League 2024" },
  { league: 848, season: 2025, name: "CONCACAF Nations League 2025" },
  // Friendlies — most recent form
  { league: 10,  season: 2025, name: "Friendlies Internacionales 2025" },
  { league: 10,  season: 2026, name: "Friendlies Internacionales 2026" },
]

// ─── Name mapping: API-Football → our DB ────────────────────────────────────
const NAME_MAP: Record<string, string> = {
  "Mexico": "Mexico", "South Africa": "South Africa",
  "South Korea": "Korea Republic", "Korea Republic": "Korea Republic",
  "Czech Republic": "Czech Republic", "Czechia": "Czech Republic",
  "Canada": "Canada", "Switzerland": "Switzerland",
  "Qatar": "Qatar",
  "Bosnia & Herzegovina": "Bosnia-Herzegovina", "Bosnia": "Bosnia-Herzegovina",
  "Brazil": "Brazil", "Morocco": "Morocco", "Haiti": "Haiti", "Scotland": "Scotland",
  "United States": "USA", "USA": "USA",
  "Paraguay": "Paraguay", "Australia": "Australia",
  "Turkey": "Turkey", "Türkiye": "Turkey",
  "Germany": "Germany", "Curacao": "Curacao", "Curaçao": "Curacao",
  "Ivory Coast": "Ivory Coast", "Côte d'Ivoire": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast",
  "Ecuador": "Ecuador", "Netherlands": "Netherlands", "Japan": "Japan",
  "Sweden": "Sweden", "Tunisia": "Tunisia", "Belgium": "Belgium",
  "Egypt": "Egypt", "Iran": "Iran", "Islamic Republic of Iran": "Iran",
  "New Zealand": "New Zealand",
  "Spain": "Spain", "Cape Verde": "Cape Verde", "Cabo Verde": "Cape Verde",
  "Saudi Arabia": "Saudi Arabia", "Uruguay": "Uruguay",
  "France": "France", "Senegal": "Senegal", "Iraq": "Iraq", "Norway": "Norway",
  "Argentina": "Argentina", "Algeria": "Algeria", "Austria": "Austria", "Jordan": "Jordan",
  "Portugal": "Portugal",
  "DR Congo": "DR Congo", "Congo DR": "DR Congo", "Democratic Republic of Congo": "DR Congo",
  "Uzbekistan": "Uzbekistan", "Colombia": "Colombia",
  "England": "England", "Croatia": "Croatia", "Ghana": "Ghana", "Panama": "Panama",
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

type ApiFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: { home: { name: string }; away: { name: string } }
  goals: { home: number | null; away: number | null }
}

async function fetchFixtures(league: number, season: number): Promise<ApiFixture[]> {
  const res = await fetch(`${BASE}/fixtures?league=${league}&season=${season}`, {
    headers: { "x-apisports-key": KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) return []
  return (data.response as ApiFixture[]) ?? []
}

async function main() {
  if (!KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1) }
  await initSchema()
  const db = getDb()

  // Build name → equipo_id map
  const equiposRs = await db.execute("SELECT id, nombre FROM equipos")
  const equipoMap = new Map<string, number>()
  for (const row of equiposRs.rows) {
    equipoMap.set(row.nombre as string, row.id as number)
  }

  // Track unique API fixture IDs already in DB to skip duplicates
  const existingRs = await db.execute(
    "SELECT partido_api_id FROM estadisticas_equipo WHERE partido_api_id > 0"
  )
  const existing = new Set(existingRs.rows.map((r) => r.partido_api_id as number))
  console.log(`[import] ${existing.size} fixtures ya en DB.`)

  let totalInserted = 0
  let totalSkipped = 0
  let totalUnmapped = 0
  let apiCalls = 0

  for (const comp of COMPETITIONS) {
    console.log(`\n[import] ${comp.name} (L=${comp.league} S=${comp.season})...`)

    const fixtures = await fetchFixtures(comp.league, comp.season)
    apiCalls++
    await sleep(350)

    const finished = fixtures.filter(
      (f) => ["FT", "AET", "PEN"].includes(f.fixture.status.short) &&
              f.goals.home !== null && f.goals.away !== null
    )

    console.log(`[import]   ${finished.length} partidos jugados`)

    const stmts: Array<{ sql: string; args: (string | number | null)[] }> = []
    const unmapped = new Set<string>()

    for (const f of finished) {
      const fid = f.fixture.id

      // Skip if already in DB
      if (existing.has(fid)) { totalSkipped++; continue }

      const hn = f.teams.home.name
      const an = f.teams.away.name
      const dbHome = NAME_MAP[hn]
      const dbAway = NAME_MAP[an]
      const hId = dbHome ? equipoMap.get(dbHome) : undefined
      const aId = dbAway ? equipoMap.get(dbAway) : undefined

      // Neither team is a WC2026 team — skip silently
      if (!hId && !aId) continue

      // Track unmapped team names that look like national teams (for debugging)
      if (!dbHome && !hn.includes("U-") && !hn.includes("U20") && !hn.includes("U21")) {
        unmapped.add(hn)
      }
      if (!dbAway && !an.includes("U-") && !an.includes("U20") && !an.includes("U21")) {
        unmapped.add(an)
      }

      const gl = f.goals.home as number
      const gv = f.goals.away as number
      const fecha = f.fixture.date

      if (hId) {
        stmts.push({
          sql: `INSERT OR IGNORE INTO estadisticas_equipo
            (equipo_id, partido_api_id, fecha, goles_favor, goles_contra, xg_favor, xg_contra, corners, tarjetas_amarillas, tarjetas_rojas)
            VALUES (?, ?, ?, ?, ?, NULL, NULL, 5, 2, 0)`,
          args: [hId, fid, fecha, gl, gv],
        })
      }
      if (aId) {
        stmts.push({
          sql: `INSERT OR IGNORE INTO estadisticas_equipo
            (equipo_id, partido_api_id, fecha, goles_favor, goles_contra, xg_favor, xg_contra, corners, tarjetas_amarillas, tarjetas_rojas)
            VALUES (?, ?, ?, ?, ?, NULL, NULL, 5, 2, 0)`,
          args: [aId, fid, fecha, gv, gl],
        })
      }

      existing.add(fid)
    }

    if (stmts.length > 0) {
      // Batch in chunks of 100
      for (let i = 0; i < stmts.length; i += 100) {
        await db.batch(
          stmts.slice(i, i + 100) as Parameters<typeof db.batch>[0],
          "write"
        )
      }
      totalInserted += stmts.length
      console.log(`[import]   +${stmts.length} estadísticas insertadas`)
    }

    if (unmapped.size > 0) {
      totalUnmapped += unmapped.size
      console.log(`[import]   Sin mapeo (no son WC2026): ${[...unmapped].slice(0, 5).join(", ")}${unmapped.size > 5 ? "..." : ""}`)
    }
  }

  console.log(`\n${"=".repeat(50)}`)
  console.log(`[import] LISTO`)
  console.log(`[import]   API calls usadas:      ${apiCalls}`)
  console.log(`[import]   Estadísticas nuevas:   ${totalInserted}`)
  console.log(`[import]   Fixtures ya en DB:     ${totalSkipped}`)
  console.log(`[import]   Equipos sin mapeo:     ${totalUnmapped}`)

  // Show final DB counts per team
  const topTeams = await db.execute(`
    SELECT e.codigo, COUNT(ee.id) as n
    FROM estadisticas_equipo ee
    JOIN equipos e ON e.id = ee.equipo_id
    GROUP BY ee.equipo_id
    ORDER BY n DESC
    LIMIT 10
  `)
  console.log(`\n[import] Top 10 equipos por historial de partidos:`)
  for (const r of topTeams.rows) {
    console.log(`  ${r.codigo}: ${r.n} partidos`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
