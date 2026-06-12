/**
 * Genera predicciones para los 72 partidos del Mundial 2026.
 * Usa los datos de estadisticas_equipo ya en la DB (sin llamar la API).
 * Run: pnpm tsx --env-file=.env.local scripts/seed-predicciones.ts
 */
import { initSchema } from "@/lib/db/schema"
import { getDb } from "@/lib/db"
import {
  getEstadisticasEquipo,
  getJugadoresEquipo,
  insertPrediccion,
} from "@/lib/db/queries"
import { predecirPartido } from "@/lib/model"
import type { StatsPartido, Partido } from "@/types"

const PARTIDO_SELECT = `
  SELECT
    p.id, p.fase, p.grupo, p.fecha_utc, p.estadio,
    el.id   AS local_id,   el.nombre AS local_nombre,   el.codigo AS local_codigo,   el.logo_url AS local_logo,
    ev.id   AS vis_id,     ev.nombre AS vis_nombre,     ev.codigo AS vis_codigo,     ev.logo_url AS vis_logo,
    NULL AS goles_local, NULL AS goles_visitante
  FROM partidos p
  JOIN equipos el ON el.id = p.equipo_local_id
  JOIN equipos ev ON ev.id = p.equipo_visitante_id
  ORDER BY p.fecha_utc
`

async function main() {
  await initSchema()
  const db = getDb()
  const rs = await db.execute(PARTIDO_SELECT)

  const partidos = rs.rows.map((r) => ({
    id: r.id as number,
    fase: r.fase as Partido["fase"],
    grupo: r.grupo as string | null,
    fechaUtc: r.fecha_utc as string,
    estadio: r.estadio as string,
    golesLocal: r.goles_local as number | null,
    golesVisitante: r.goles_visitante as number | null,
    equipoLocal: {
      id: r.local_id as number,
      nombre: r.local_nombre as string,
      codigo: r.local_codigo as string,
      logoUrl: r.local_logo as string | null,
    },
    equipoVisitante: {
      id: r.vis_id as number,
      nombre: r.vis_nombre as string,
      codigo: r.vis_codigo as string,
      logoUrl: r.vis_logo as string | null,
    },
  })) as Partido[]

  console.log(`[seed-pred] ${partidos.length} partidos encontrados.`)

  let ok = 0
  let err = 0

  for (const partido of partidos) {
    try {
      const stats: StatsPartido = {
        local: await getEstadisticasEquipo(partido.equipoLocal.id, 10),
        visitante: await getEstadisticasEquipo(partido.equipoVisitante.id, 10),
        jugadoresLocal: await getJugadoresEquipo(partido.equipoLocal.id),
        jugadoresVisitante: await getJugadoresEquipo(partido.equipoVisitante.id),
      }

      const prediccion = predecirPartido(partido, stats)
      await insertPrediccion(prediccion)
      ok++
      process.stdout.write(`[ok] ${partido.equipoLocal.codigo} vs ${partido.equipoVisitante.codigo}\n`)
    } catch (e) {
      err++
      process.stderr.write(`[err] Partido ${partido.id}: ${e}\n`)
    }
  }

  console.log(`\n[seed-pred] Listo: ${ok} predicciones generadas, ${err} errores.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
