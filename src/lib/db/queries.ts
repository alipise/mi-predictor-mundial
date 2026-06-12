import { getDb } from "."
import type { Equipo, Partido, Prediccion, EstadisticaEquipo, Jugador } from "@/types"

// --- Mappers ---

function rowToPartido(row: Record<string, unknown>): Partido {
  return {
    id: row.id as number,
    fase: row.fase as Partido["fase"],
    grupo: (row.grupo as string | null) ?? undefined,
    fechaUtc: row.fecha_utc as string,
    estadio: row.estadio as string,
    equipoLocal: {
      id: row.local_id as number,
      nombre: row.local_nombre as string,
      codigo: row.local_codigo as string,
      grupo: row.local_grupo as string,
      logoUrl: (row.local_logo as string | null) ?? null,
    },
    equipoVisitante: {
      id: row.visita_id as number,
      nombre: row.visita_nombre as string,
      codigo: row.visita_codigo as string,
      grupo: row.visita_grupo as string,
      logoUrl: (row.visita_logo as string | null) ?? null,
    },
  }
}

function rowToPrediccion(row: Record<string, unknown>): Prediccion {
  return {
    partidoId: row.partido_id as number,
    timestamp: row.timestamp as string,
    mercados: JSON.parse(row.mercados_json as string),
    goleadoresProbables: JSON.parse(row.goleadores_json as string),
  }
}

const PARTIDO_SELECT = `
  SELECT
    p.id, p.fase, p.grupo, p.fecha_utc, p.estadio,
    el.id    as local_id,   el.nombre as local_nombre,   el.codigo as local_codigo,
    el.grupo as local_grupo, el.logo_url as local_logo,
    ev.id    as visita_id,  ev.nombre as visita_nombre,  ev.codigo as visita_codigo,
    ev.grupo as visita_grupo, ev.logo_url as visita_logo
  FROM partidos p
  JOIN equipos el ON el.id = p.equipo_local_id
  JOIN equipos ev ON ev.id = p.equipo_visitante_id
`

// --- Partidos ---

export async function getPartidoById(id: number): Promise<Partido | null> {
  const db = getDb()
  const rs = await db.execute({ sql: `${PARTIDO_SELECT} WHERE p.id = ?`, args: [id] })
  const row = rs.rows[0]
  return row ? rowToPartido(row as unknown as Record<string, unknown>) : null
}

export async function getPartidosByFase(fase: Partido["fase"]): Promise<Partido[]> {
  const db = getDb()
  const rs = await db.execute({
    sql: `${PARTIDO_SELECT} WHERE p.fase = ? ORDER BY p.fecha_utc`,
    args: [fase],
  })
  return rs.rows.map((r) => rowToPartido(r as unknown as Record<string, unknown>))
}

export async function getPartidosGrupo(grupo: string): Promise<Partido[]> {
  const db = getDb()
  const rs = await db.execute({
    sql: `${PARTIDO_SELECT} WHERE p.grupo = ? ORDER BY p.fecha_utc`,
    args: [grupo],
  })
  return rs.rows.map((r) => rowToPartido(r as unknown as Record<string, unknown>))
}

export async function getProximosPartidos(limit = 8): Promise<Partido[]> {
  const db = getDb()
  const ahora = new Date().toISOString()
  const rs = await db.execute({
    sql: `${PARTIDO_SELECT} WHERE p.fecha_utc >= ? ORDER BY p.fecha_utc LIMIT ?`,
    args: [ahora, limit],
  })
  return rs.rows.map((r) => rowToPartido(r as unknown as Record<string, unknown>))
}

export async function getPartidosEnVentana(dias = 7): Promise<Partido[]> {
  const db = getDb()
  const ahora = new Date()
  const fin = new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000)
  const rs = await db.execute({
    sql: `${PARTIDO_SELECT} WHERE p.fecha_utc >= ? AND p.fecha_utc <= ? ORDER BY p.fecha_utc`,
    args: [ahora.toISOString(), fin.toISOString()],
  })
  return rs.rows.map((r) => rowToPartido(r as unknown as Record<string, unknown>))
}

export async function getPartidosByRango(desde: string, hasta: string): Promise<Partido[]> {
  const db = getDb()
  const rs = await db.execute({
    sql: `${PARTIDO_SELECT} WHERE p.fecha_utc >= ? AND p.fecha_utc < ? ORDER BY p.fecha_utc`,
    args: [desde, hasta],
  })
  return rs.rows.map((r) => rowToPartido(r as unknown as Record<string, unknown>))
}

// --- Predicciones ---

export async function getPrediccionLatest(partidoId: number): Promise<Prediccion | null> {
  const db = getDb()
  const rs = await db.execute({
    sql: `SELECT * FROM predicciones WHERE partido_id = ? ORDER BY timestamp DESC LIMIT 1`,
    args: [partidoId],
  })
  const row = rs.rows[0]
  return row ? rowToPrediccion(row as unknown as Record<string, unknown>) : null
}

export async function getHistorialPredicciones(partidoId: number): Promise<Prediccion[]> {
  const db = getDb()
  const rs = await db.execute({
    sql: `SELECT * FROM predicciones WHERE partido_id = ? ORDER BY timestamp DESC`,
    args: [partidoId],
  })
  return rs.rows.map((r) => rowToPrediccion(r as unknown as Record<string, unknown>))
}

export async function insertPrediccion(p: Prediccion): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO predicciones (partido_id, timestamp, mercados_json, goleadores_json) VALUES (?, ?, ?, ?)`,
    args: [p.partidoId, p.timestamp, JSON.stringify(p.mercados), JSON.stringify(p.goleadoresProbables)],
  })
}

// --- Equipos y grupos ---

export async function getGruposConEquipos(): Promise<Record<string, Equipo[]>> {
  const db = getDb()
  const rs = await db.execute("SELECT * FROM equipos ORDER BY grupo, nombre")
  const grupos: Record<string, Equipo[]> = {}
  for (const row of rs.rows) {
    const r = row as unknown as Record<string, unknown>
    const equipo: Equipo = {
      id: r.id as number,
      nombre: r.nombre as string,
      codigo: r.codigo as string,
      grupo: r.grupo as string,
      logoUrl: (r.logo_url as string | null) ?? null,
    }
    if (!grupos[equipo.grupo]) grupos[equipo.grupo] = []
    grupos[equipo.grupo].push(equipo)
  }
  return grupos
}

// --- Estadísticas ---

export async function getEstadisticasEquipo(equipoId: number, ultimos: number): Promise<EstadisticaEquipo[]> {
  const db = getDb()
  const rs = await db.execute({
    sql: `SELECT * FROM estadisticas_equipo WHERE equipo_id = ? ORDER BY fecha DESC LIMIT ?`,
    args: [equipoId, ultimos],
  })
  return rs.rows.map((row) => {
    const r = row as unknown as Record<string, unknown>
    return {
      equipoId: r.equipo_id as number,
      partidoApiId: r.partido_api_id as number,
      fecha: r.fecha as string,
      golesFavor: r.goles_favor as number,
      golesContra: r.goles_contra as number,
      xgFavor: r.xg_favor as number | null,
      xgContra: r.xg_contra as number | null,
      corners: r.corners as number,
      tarjetasAmarillas: r.tarjetas_amarillas as number,
      tarjetasRojas: r.tarjetas_rojas as number,
    }
  })
}

export async function insertEstadistica(e: EstadisticaEquipo): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `INSERT OR REPLACE INTO estadisticas_equipo
      (equipo_id, partido_api_id, goles_favor, goles_contra, xg_favor, xg_contra,
       corners, tarjetas_amarillas, tarjetas_rojas, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      e.equipoId, e.partidoApiId, e.golesFavor, e.golesContra,
      e.xgFavor, e.xgContra, e.corners, e.tarjetasAmarillas, e.tarjetasRojas, e.fecha,
    ],
  })
}

// --- Jugadores ---

export async function getJugadoresEquipo(equipoId: number): Promise<Jugador[]> {
  const db = getDb()
  const rs = await db.execute({
    sql: `SELECT * FROM jugadores WHERE equipo_id = ?`,
    args: [equipoId],
  })
  return rs.rows.map((row) => {
    const r = row as unknown as Record<string, unknown>
    return {
      id: r.id as number,
      equipoId: r.equipo_id as number,
      nombre: r.nombre as string,
      posicion: r.posicion as string | null,
      numero: r.numero as number | null,
      tasaGolesPor90: r.tasa_goles_por_90 as number,
    }
  })
}
