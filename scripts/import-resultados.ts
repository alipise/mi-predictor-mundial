/**
 * Importa resultados reales del Mundial 2026 usando la API-Football.
 * Estrategia: query por fecha (no requiere season=2026, que está bloqueado en Free plan).
 * Run: pnpm import:resultados
 */
import { initSchema } from "@/lib/db/schema"
import { getDb } from "@/lib/db"
import { actualizarResultado } from "@/lib/db/queries"

const API_KEY = process.env.RAPIDAPI_KEY ?? ""
const BASE_URL = "https://v3.football.api-sports.io"
const WC_LEAGUE_ID = 1
const WC_START = "2026-06-11"

// Mapeo de nombres API → nombres en nuestra DB
const NAME_MAP: Record<string, string> = {
  "Mexico": "Mexico", "South Africa": "South Africa",
  "South Korea": "Korea Republic", "Korea Republic": "Korea Republic",
  "Czech Republic": "Czech Republic", "Czechia": "Czech Republic",
  "Canada": "Canada", "Switzerland": "Switzerland",
  "Qatar": "Qatar", "Bosnia & Herzegovina": "Bosnia-Herzegovina",
  "Bosnia-Herzegovina": "Bosnia-Herzegovina", "Bosnia": "Bosnia-Herzegovina",
  "Brazil": "Brazil", "Morocco": "Morocco", "Haiti": "Haiti", "Scotland": "Scotland",
  "United States": "USA", "USA": "USA",
  "Paraguay": "Paraguay", "Australia": "Australia",
  "Turkey": "Turkey", "Türkiye": "Turkey",
  "Germany": "Germany", "Curacao": "Curacao", "Curaçao": "Curacao",
  "Ivory Coast": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast", "Côte d'Ivoire": "Ivory Coast",
  "Ecuador": "Ecuador", "Netherlands": "Netherlands", "Japan": "Japan",
  "Sweden": "Sweden", "Tunisia": "Tunisia", "Belgium": "Belgium",
  "Egypt": "Egypt", "Iran": "Iran", "New Zealand": "New Zealand",
  "Spain": "Spain", "Cape Verde": "Cape Verde", "Cabo Verde": "Cape Verde",
  "Saudi Arabia": "Saudi Arabia", "Uruguay": "Uruguay",
  "France": "France", "Senegal": "Senegal", "Iraq": "Iraq", "Norway": "Norway",
  "Argentina": "Argentina", "Algeria": "Algeria", "Austria": "Austria", "Jordan": "Jordan",
  "Portugal": "Portugal", "DR Congo": "DR Congo", "Congo DR": "DR Congo",
  "Democratic Republic of Congo": "DR Congo",
  "Uzbekistan": "Uzbekistan", "Colombia": "Colombia",
  "England": "England", "Croatia": "Croatia", "Ghana": "Ghana", "Panama": "Panama",
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function allDatesBetween(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from + "T00:00:00Z")
  const end = new Date(to + "T00:00:00Z")
  while (cur <= end) {
    dates.push(isoDate(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

async function fetchWcFixturesByDate(date: string) {
  const res = await fetch(`${BASE_URL}/fixtures?date=${date}`, {
    headers: { "x-apisports-key": API_KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data.response)) return []
  return data.response.filter(
    (f: { league: { id: number } }) => f.league.id === WC_LEAGUE_ID
  )
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function main() {
  if (!API_KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1) }
  await initSchema()
  const db = getDb()

  // Build local-name → partido_id map
  const rs = await db.execute(`
    SELECT p.id, el.nombre AS local, ev.nombre AS visitante
    FROM partidos p
    JOIN equipos el ON el.id = p.equipo_local_id
    JOIN equipos ev ON ev.id = p.equipo_visitante_id
  `)
  const partidoMap = new Map<string, number>()
  for (const row of rs.rows) {
    const key = `${row.local}|${row.visitante}`
    partidoMap.set(key, row.id as number)
  }

  const today = isoDate(new Date())
  const dates = allDatesBetween(WC_START, today)
  console.log(`[resultados] Consultando ${dates.length} fechas (${WC_START} → ${today})...`)

  let actualizados = 0
  let noEncontrados = 0

  for (const date of dates) {
    const fixtures = await fetchWcFixturesByDate(date)
    const finished = fixtures.filter(
      (f: { fixture: { status: { short: string } } }) => f.fixture.status.short === "FT" || f.fixture.status.short === "AET" || f.fixture.status.short === "PEN"
    )
    if (finished.length === 0) { await sleep(200); continue }

    for (const f of finished) {
      const apiHome = f.teams.home.name as string
      const apiAway = f.teams.away.name as string
      const dbHome = NAME_MAP[apiHome]
      const dbAway = NAME_MAP[apiAway]

      if (!dbHome || !dbAway) {
        console.warn(`[resultados]   Sin mapeo: "${apiHome}" vs "${apiAway}"`)
        noEncontrados++
        continue
      }

      const key = `${dbHome}|${dbAway}`
      const partidoId = partidoMap.get(key)

      if (!partidoId) {
        console.warn(`[resultados]   Partido no encontrado en DB: ${dbHome} vs ${dbAway}`)
        noEncontrados++
        continue
      }

      const gl = f.goals.home as number
      const gv = f.goals.away as number
      await actualizarResultado(partidoId, gl, gv)
      console.log(`[resultados]   ${dbHome} ${gl}-${gv} ${dbAway}  (id=${partidoId})`)
      actualizados++
    }

    await sleep(250)
  }

  console.log(`\n[resultados] Listo: ${actualizados} resultados importados, ${noEncontrados} no encontrados.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
