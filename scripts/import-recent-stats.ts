/**
 * Imports recent official FIFA international competition stats.
 * Run: pnpm import:recent
 */
import { initSchema } from "@/lib/db/schema"
import { getDb } from "@/lib/db"

const API_KEY = process.env.RAPIDAPI_KEY ?? ""
const BASE_URL = "https://v3.football.api-sports.io"

interface Competition { league: number; season: number; name: string }

const COMPETITIONS: Competition[] = [
  { league: 32, season: 2024, name: "WC Qualifiers — UEFA (2026 cycle)" },
  { league: 29, season: 2023, name: "WC Qualifiers — CAF (2026 cycle)" },
  { league: 34, season: 2022, name: "WC Qualifiers — CONMEBOL (2022 cycle)" },
  { league: 31, season: 2022, name: "WC Qualifiers — CONCACAF (2022 cycle)" },
  { league: 30, season: 2022, name: "WC Qualifiers — AFC (2022 cycle)" },
  { league: 4,  season: 2024, name: "UEFA Euro 2024" },
  { league: 9,  season: 2024, name: "Copa America 2024" },
  { league: 6,  season: 2023, name: "AFCON 2023" },
  { league: 7,  season: 2023, name: "AFC Asian Cup 2023" },
  { league: 22, season: 2023, name: "CONCACAF Gold Cup 2023" },
  { league: 1,  season: 2022, name: "FIFA World Cup 2022" },
]

const NAME_MAP: Record<string, string> = {
  "Mexico": "Mexico", "South Africa": "South Africa", "Korea Republic": "Korea Republic",
  "South Korea": "Korea Republic", "Czech Republic": "Czech Republic", "Czechia": "Czech Republic",
  "Canada": "Canada", "Switzerland": "Switzerland", "Qatar": "Qatar",
  "Bosnia": "Bosnia-Herzegovina", "Bosnia & Herzegovina": "Bosnia-Herzegovina", "Bosnia-Herzegovina": "Bosnia-Herzegovina",
  "Brazil": "Brazil", "Morocco": "Morocco", "Haiti": "Haiti", "Scotland": "Scotland",
  "USA": "USA", "United States": "USA", "Paraguay": "Paraguay", "Australia": "Australia",
  "Turkey": "Turkey", "Türkiye": "Turkey", "Germany": "Germany", "Curacao": "Curacao",
  "Curaçao": "Curacao", "Ivory Coast": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast", "Ecuador": "Ecuador",
  "Netherlands": "Netherlands", "Japan": "Japan", "Sweden": "Sweden", "Tunisia": "Tunisia",
  "Belgium": "Belgium", "Egypt": "Egypt", "Iran": "Iran", "New Zealand": "New Zealand",
  "Spain": "Spain", "Cape Verde": "Cape Verde", "Cabo Verde": "Cape Verde",
  "Saudi Arabia": "Saudi Arabia", "Uruguay": "Uruguay", "France": "France",
  "Senegal": "Senegal", "Iraq": "Iraq", "Norway": "Norway", "Argentina": "Argentina",
  "Algeria": "Algeria", "Austria": "Austria", "Jordan": "Jordan", "Portugal": "Portugal",
  "DR Congo": "DR Congo", "Congo DR": "DR Congo", "Democratic Republic of Congo": "DR Congo",
  "Uzbekistan": "Uzbekistan", "Colombia": "Colombia", "England": "England",
  "Croatia": "Croatia", "Ghana": "Ghana", "Panama": "Panama",
}

type ApiFixture = {
  fixture: { id: number; date: string }
  teams: { home: { name: string }; away: { name: string } }
  goals: { home: number | null; away: number | null }
}

async function fetchFixtures(league: number, season: number): Promise<ApiFixture[] | null> {
  const res = await fetch(`${BASE_URL}/fixtures?league=${league}&season=${season}`, {
    headers: { "x-apisports-key": API_KEY },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.warn(`[import]   API error: ${JSON.stringify(data.errors)}`)
    return null
  }
  return Array.isArray(data.response) ? (data.response as ApiFixture[]) : null
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function main() {
  if (!API_KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1) }
  await initSchema()
  const db = getDb()

  let totalInserted = 0
  let totalFixtures = 0

  // Pre-load equipo name → id map
  const equiposRs = await db.execute("SELECT id, nombre FROM equipos")
  const equipoMap = new Map<string, number>()
  for (const row of equiposRs.rows) {
    equipoMap.set(row.nombre as string, row.id as number)
  }

  for (const comp of COMPETITIONS) {
    console.log(`[import] ${comp.name} (league=${comp.league}, season=${comp.season})...`)
    const fixtures = await fetchFixtures(comp.league, comp.season)
    if (!fixtures) { console.log(`[import]   sin datos — saltando`); await sleep(400); continue }

    const finished = fixtures.filter((f) => f.goals.home !== null && f.goals.away !== null)
    const teamMatches: Record<string, Array<{ fid: number; date: string; gf: number; gc: number }>> = {}
    for (const f of finished) {
      const hg = f.goals.home as number
      const ag = f.goals.away as number
      const hn = f.teams.home.name
      const an = f.teams.away.name
      if (!teamMatches[hn]) teamMatches[hn] = []
      if (!teamMatches[an]) teamMatches[an] = []
      teamMatches[hn].push({ fid: f.fixture.id, date: f.fixture.date, gf: hg, gc: ag })
      teamMatches[an].push({ fid: f.fixture.id, date: f.fixture.date, gf: ag, gc: hg })
    }

    const stmts: Array<{ sql: string; args: (string | number | null)[] }> = []
    for (const [apiName, matches] of Object.entries(teamMatches)) {
      const dbName = NAME_MAP[apiName]
      if (!dbName) continue
      const equipoId = equipoMap.get(dbName)
      if (!equipoId) continue
      for (const m of matches) {
        stmts.push({
          sql: `INSERT OR IGNORE INTO estadisticas_equipo
            (equipo_id, partido_api_id, fecha, goles_favor, goles_contra, xg_favor, xg_contra, corners, tarjetas_amarillas, tarjetas_rojas)
            VALUES (?, ?, ?, ?, ?, NULL, NULL, 5, 2, 0)`,
          args: [equipoId, m.fid, m.date, m.gf, m.gc],
        })
      }
    }

    if (stmts.length > 0) await db.batch(stmts, "write")
    totalFixtures += finished.length
    totalInserted += stmts.length
    console.log(`[import]   ${finished.length} partidos jugados → ${stmts.length} stats`)
    await sleep(350)
  }

  console.log(`\n[import] Listo. ${totalFixtures} partidos, ${totalInserted} estadísticas insertadas.`)
}

main().catch((err) => { console.error(err); process.exit(1) })
