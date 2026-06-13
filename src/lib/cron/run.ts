import { initSchema } from "@/lib/db/schema"
import { getDb } from "@/lib/db"
import {
  getPartidosEnVentana,
  getEstadisticasEquipo,
  getJugadoresEquipo,
  insertPrediccion,
  insertEstadistica,
  actualizarResultado,
  guardarCalculo,
} from "@/lib/db/queries"
import { predecirPartido } from "@/lib/model"
import type { StatsPartido, Partido } from "@/types"

const ULTIMOS_PARTIDOS = 10
const WC_LEAGUE_ID = 1
const WC_START = "2026-06-11"
const API_KEY = process.env.RAPIDAPI_KEY ?? ""
const BASE_URL = "https://v3.football.api-sports.io"

// ─── Name mapping: API-Football → our DB ────────────────────────────────────
const NAME_MAP: Record<string, string> = {
  "Mexico": "Mexico", "South Africa": "South Africa",
  "South Korea": "Korea Republic", "Korea Republic": "Korea Republic",
  "Czech Republic": "Czech Republic", "Czechia": "Czech Republic",
  "Canada": "Canada", "Switzerland": "Switzerland",
  "Qatar": "Qatar", "Bosnia & Herzegovina": "Bosnia-Herzegovina",
  "Bosnia": "Bosnia-Herzegovina",
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

function allDatesSince(from: string): string[] {
  const dates: string[] = []
  const cur = new Date(from + "T00:00:00Z")
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  while (cur <= today) {
    dates.push(isoDate(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ─── Step 1: Import real results from API-Football ──────────────────────────
async function importResultados() {
  if (!API_KEY) return

  const db = getDb()
  const rs = await db.execute(`
    SELECT p.id, el.nombre AS local, ev.nombre AS visitante
    FROM partidos p
    JOIN equipos el ON el.id = p.equipo_local_id
    JOIN equipos ev ON ev.id = p.equipo_visitante_id
  `)
  const partidoMap = new Map<string, number>()
  for (const row of rs.rows) {
    partidoMap.set(`${row.local}|${row.visitante}`, row.id as number)
  }

  const dates = allDatesSince(WC_START)
  let count = 0

  for (const date of dates) {
    const res = await fetch(`${BASE_URL}/fixtures?date=${date}`, {
      headers: { "x-apisports-key": API_KEY },
    }).catch(() => null)
    if (!res?.ok) { await sleep(300); continue }

    const data = await res.json()
    const wcFixtures = (data.response ?? []).filter(
      (f: { league: { id: number } }) => f.league.id === WC_LEAGUE_ID
    )
    const finished = wcFixtures.filter(
      (f: { fixture: { status: { short: string } } }) =>
        ["FT", "AET", "PEN"].includes(f.fixture.status.short)
    )

    for (const f of finished) {
      const dbHome = NAME_MAP[f.teams.home.name as string]
      const dbAway = NAME_MAP[f.teams.away.name as string]
      if (!dbHome || !dbAway) continue
      const partidoId = partidoMap.get(`${dbHome}|${dbAway}`)
      if (!partidoId) continue

      const gl = f.goals.home as number
      const gv = f.goals.away as number
      await actualizarResultado(partidoId, gl, gv)
      count++
    }

    await sleep(250)
  }

  if (count > 0) console.log(`[cron] ${count} resultados actualizados.`)
}

// ─── Step 2: Push played WC2026 match scores into estadisticas_equipo ───────
async function syncStatsFromResultados() {
  const db = getDb()

  // Get all finished WC2026 matches that don't yet have stats in our table
  const rs = await db.execute(`
    SELECT
      p.id, p.fecha_utc,
      p.goles_local, p.goles_visitante,
      p.equipo_local_id, p.equipo_visitante_id
    FROM partidos p
    WHERE p.goles_local IS NOT NULL
      AND p.id NOT IN (
        SELECT partido_api_id FROM estadisticas_equipo
        WHERE partido_api_id < 1000
      )
  `)

  const stmts: Array<{ sql: string; args: (string | number | null)[] }> = []

  for (const row of rs.rows) {
    const gl = row.goles_local as number
    const gv = row.goles_visitante as number
    const fecha = row.fecha_utc as string
    // Use negative partido ID as partido_api_id to avoid collision with real API IDs
    const fakeApiId = -(row.id as number)

    // Local team: scored gl, conceded gv
    stmts.push({
      sql: `INSERT OR IGNORE INTO estadisticas_equipo
        (equipo_id, partido_api_id, fecha, goles_favor, goles_contra, xg_favor, xg_contra, corners, tarjetas_amarillas, tarjetas_rojas)
        VALUES (?, ?, ?, ?, ?, NULL, NULL, 5, 2, 0)`,
      args: [row.equipo_local_id as number, fakeApiId, fecha, gl, gv],
    })
    // Away team: scored gv, conceded gl
    stmts.push({
      sql: `INSERT OR IGNORE INTO estadisticas_equipo
        (equipo_id, partido_api_id, fecha, goles_favor, goles_contra, xg_favor, xg_contra, corners, tarjetas_amarillas, tarjetas_rojas)
        VALUES (?, ?, ?, ?, ?, NULL, NULL, 5, 2, 0)`,
      args: [row.equipo_visitante_id as number, fakeApiId * 2 - 1, fecha, gv, gl],
    })
  }

  if (stmts.length > 0) {
    await db.batch(stmts, "write")
    console.log(`[cron] ${stmts.length / 2} partidos WC2026 sincronizados a estadisticas.`)
  }
}

// ─── Step 3: Recalculate predictions for upcoming matches ────────────────────
async function recalcularPredicciones(): Promise<number> {
  const partidos = await getPartidosEnVentana(8)
  console.log(`[cron] ${partidos.length} partidos en ventana de 8 días.`)

  for (const partido of partidos) {
    try {
      const stats: StatsPartido = {
        local: await getEstadisticasEquipo(partido.equipoLocal.id, ULTIMOS_PARTIDOS),
        visitante: await getEstadisticasEquipo(partido.equipoVisitante.id, ULTIMOS_PARTIDOS),
        jugadoresLocal: await getJugadoresEquipo(partido.equipoLocal.id),
        jugadoresVisitante: await getJugadoresEquipo(partido.equipoVisitante.id),
      }
      const prediccion = predecirPartido(partido, stats)
      await insertPrediccion(prediccion)
      console.log(`[cron] ok ${partido.equipoLocal.codigo} vs ${partido.equipoVisitante.codigo}`)
    } catch (err) {
      console.error(`[cron] error Partido ${partido.id}:`, err)
    }
  }

  return partidos.length
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function runCron() {
  console.log("[cron] Iniciando", new Date().toISOString())
  await initSchema()

  // 1. Pull real results from API → partidos.goles_local / goles_visitante
  await importResultados()

  // 2. Convert those results into estadisticas_equipo so the model uses them
  await syncStatsFromResultados()

  // 3. Recalculate predictions for the next 8 days using fresh stats
  const partidosActualizados = await recalcularPredicciones()

  // 4. Save timestamp of this calculation
  await guardarCalculo(partidosActualizados)

  console.log("[cron] Completado", new Date().toISOString())
}

async function main() {
  await runCron()
}

main().catch((err) => { console.error(err); process.exit(1) })
