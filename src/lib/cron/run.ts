import { initSchema } from "@/lib/db/schema"
import {
  getPartidosEnVentana,
  getEstadisticasEquipo,
  getJugadoresEquipo,
  insertPrediccion,
  insertEstadistica,
} from "@/lib/db/queries"
import { predecirPartido } from "@/lib/model"
import { footballApi } from "@/lib/api/football"
import type { StatsPartido } from "@/types"

const ULTIMOS_PARTIDOS = 10

async function fetchStatsEquipo(equipoId: number) {
  if (!process.env.RAPIDAPI_KEY) return

  const fixtures = await footballApi.getLastFixtures(equipoId, ULTIMOS_PARTIDOS)
  for (const f of fixtures) {
    const stats = await footballApi.getFixtureStats(f.fixture.id)
    const teamStats = stats.find((s) => s.team.id === equipoId)
    if (!teamStats) continue

    const getStat = (type: string) => {
      const found = teamStats.statistics.find((s) => s.type === type)
      return typeof found?.value === "number" ? found.value : 0
    }

    await insertEstadistica({
      equipoId,
      partidoApiId: f.fixture.id,
      fecha: f.fixture.date,
      golesFavor: getStat("Goals"),
      golesContra: 0,
      xgFavor: null,
      xgContra: null,
      corners: getStat("Corner Kicks"),
      tarjetasAmarillas: getStat("Yellow Cards"),
      tarjetasRojas: getStat("Red Cards"),
    })
  }
}

export async function runCron() {
  console.log("[cron] Iniciando recálculo", new Date().toISOString())
  await initSchema()

  const partidos = await getPartidosEnVentana(8)
  console.log(`[cron] ${partidos.length} partidos en ventana de 8 días.`)

  for (const partido of partidos) {
    await Promise.all([
      fetchStatsEquipo(partido.equipoLocal.id).catch(() => {}),
      fetchStatsEquipo(partido.equipoVisitante.id).catch(() => {}),
    ])

    try {
      const stats: StatsPartido = {
        local: await getEstadisticasEquipo(partido.equipoLocal.id, ULTIMOS_PARTIDOS),
        visitante: await getEstadisticasEquipo(partido.equipoVisitante.id, ULTIMOS_PARTIDOS),
        jugadoresLocal: await getJugadoresEquipo(partido.equipoLocal.id),
        jugadoresVisitante: await getJugadoresEquipo(partido.equipoVisitante.id),
      }

      const prediccion = predecirPartido(partido, stats)
      await insertPrediccion(prediccion)

      console.log(
        `[cron] ok ${partido.equipoLocal.codigo} vs ${partido.equipoVisitante.codigo}`,
        prediccion.timestamp
      )
    } catch (err) {
      console.error(`[cron] error Partido ${partido.id}:`, err)
    }
  }

  console.log("[cron] Completado", new Date().toISOString())
}

async function main() {
  await runCron()
}

main().catch((err) => { console.error(err); process.exit(1) })
