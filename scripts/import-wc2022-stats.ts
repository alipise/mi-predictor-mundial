/**
 * Imports 2022 World Cup match stats into the DB.
 * Run: pnpm import:wc2022
 */
import { initSchema } from "@/lib/db/schema"
import { getDb } from "@/lib/db"

const API_KEY = process.env.RAPIDAPI_KEY ?? ""
const BASE_URL = "https://v3.football.api-sports.io"

const NAME_MAP: Record<string, string> = {
  "Australia": "Australia", "Argentina": "Argentina", "Belgium": "Belgium",
  "Brazil": "Brazil", "Canada": "Canada", "Croatia": "Croatia",
  "Ecuador": "Ecuador", "England": "England", "France": "France",
  "Germany": "Germany", "Ghana": "Ghana", "Iran": "Iran", "Japan": "Japan",
  "Mexico": "Mexico", "Morocco": "Morocco", "Netherlands": "Netherlands",
  "Portugal": "Portugal", "Qatar": "Qatar", "Saudi Arabia": "Saudi Arabia",
  "Senegal": "Senegal", "South Korea": "Korea Republic", "Spain": "Spain",
  "Switzerland": "Switzerland", "Tunisia": "Tunisia", "USA": "USA", "Uruguay": "Uruguay",
}

async function main() {
  if (!API_KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1) }
  await initSchema()
  const db = getDb()

  const res = await fetch(`${BASE_URL}/fixtures?league=1&season=2022`, {
    headers: { "x-apisports-key": API_KEY },
  })
  const data = await res.json()
  const fixtures = data.response as Array<{
    fixture: { id: number; date: string }
    teams: { home: { name: string }; away: { name: string } }
    goals: { home: number | null; away: number | null }
  }>

  console.log(`[import] ${fixtures.length} partidos del Mundial 2022 recibidos.`)

  // Pre-load equipo name → id map
  const equiposRs = await db.execute("SELECT id, nombre FROM equipos")
  const equipoMap = new Map<string, number>()
  for (const row of equiposRs.rows) {
    equipoMap.set(row.nombre as string, row.id as number)
  }

  const teamMatches: Record<string, Array<{ fid: number; date: string; gf: number; gc: number }>> = {}
  for (const f of fixtures) {
    const hg = f.goals.home ?? 0
    const ag = f.goals.away ?? 0
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
    if (!equipoId) { console.warn(`[import] no encontrado: "${dbName}"`); continue }
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
  console.log(`[import] ${stmts.length} estadísticas insertadas.`)
  console.log("[import] Listo. Ejecuta pnpm cron:run para recalcular predicciones.")
}

main().catch((err) => { console.error(err); process.exit(1) })
