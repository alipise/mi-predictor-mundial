/**
 * Migrates all data from the local SQLite DB to Turso remote DB.
 * Run: pnpm tsx --env-file=.env.local scripts/migrate-to-turso.ts
 */
import Database from "libsql"
import { createClient } from "@libsql/client"

const LOCAL_PATH = "data/mundial.db"

async function main() {
  console.log("[migrate] Conectando a DB local...")
  const local = new Database(LOCAL_PATH)

  console.log("[migrate] Conectando a Turso remoto...")
  const remote = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })

  // 1. Schema
  console.log("[migrate] Creando schema en Turso...")
  await remote.executeMultiple(`
    CREATE TABLE IF NOT EXISTS equipos (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      codigo TEXT NOT NULL,
      grupo TEXT NOT NULL,
      logo_url TEXT
    );
    CREATE TABLE IF NOT EXISTS jugadores (
      id INTEGER PRIMARY KEY,
      equipo_id INTEGER NOT NULL REFERENCES equipos(id),
      nombre TEXT NOT NULL,
      posicion TEXT,
      numero INTEGER,
      tasa_goles_por_90 REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS partidos (
      id INTEGER PRIMARY KEY,
      fase TEXT NOT NULL,
      grupo TEXT,
      equipo_local_id INTEGER NOT NULL REFERENCES equipos(id),
      equipo_visitante_id INTEGER NOT NULL REFERENCES equipos(id),
      fecha_utc TEXT NOT NULL,
      estadio TEXT NOT NULL,
      goles_local INTEGER,
      goles_visitante INTEGER
    );
    CREATE TABLE IF NOT EXISTS estadisticas_equipo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipo_id INTEGER NOT NULL REFERENCES equipos(id),
      partido_api_id INTEGER NOT NULL,
      goles_favor INTEGER NOT NULL DEFAULT 0,
      goles_contra INTEGER NOT NULL DEFAULT 0,
      xg_favor REAL,
      xg_contra REAL,
      corners INTEGER NOT NULL DEFAULT 0,
      tarjetas_amarillas INTEGER NOT NULL DEFAULT 0,
      tarjetas_rojas INTEGER NOT NULL DEFAULT 0,
      fecha TEXT NOT NULL,
      UNIQUE(equipo_id, partido_api_id)
    );
    CREATE TABLE IF NOT EXISTS predicciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partido_id INTEGER NOT NULL REFERENCES partidos(id),
      timestamp TEXT NOT NULL,
      mercados_json TEXT NOT NULL,
      goleadores_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_predicciones_partido ON predicciones(partido_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_estadisticas_equipo ON estadisticas_equipo(equipo_id, fecha DESC);
  `)

  // Helper: batch insert
  async function migrateTable(
    tableName: string,
    buildSql: (row: Record<string, unknown>) => { sql: string; args: unknown[] }
  ) {
    const rows = local.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[]
    if (rows.length === 0) { console.log(`[migrate]   ${tableName}: 0 filas`); return }

    const BATCH = 100
    let inserted = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      const stmts = chunk.map(buildSql)
      await remote.batch(stmts as Parameters<typeof remote.batch>[0], "write")
      inserted += chunk.length
    }
    console.log(`[migrate]   ${tableName}: ${inserted} filas`)
  }

  // 2. equipos
  console.log("[migrate] Migrando equipos...")
  await migrateTable("equipos", (r) => ({
    sql: `INSERT OR IGNORE INTO equipos (id, nombre, codigo, grupo, logo_url) VALUES (?, ?, ?, ?, ?)`,
    args: [r.id, r.nombre, r.codigo, r.grupo, r.logo_url],
  }))

  // 3. partidos
  console.log("[migrate] Migrando partidos...")
  await migrateTable("partidos", (r) => ({
    sql: `INSERT OR IGNORE INTO partidos (id, fase, grupo, equipo_local_id, equipo_visitante_id, fecha_utc, estadio, goles_local, goles_visitante) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [r.id, r.fase, r.grupo, r.equipo_local_id, r.equipo_visitante_id, r.fecha_utc, r.estadio, r.goles_local ?? null, r.goles_visitante ?? null],
  }))

  // 4. estadisticas_equipo
  console.log("[migrate] Migrando estadisticas_equipo...")
  await migrateTable("estadisticas_equipo", (r) => ({
    sql: `INSERT OR IGNORE INTO estadisticas_equipo (equipo_id, partido_api_id, goles_favor, goles_contra, xg_favor, xg_contra, corners, tarjetas_amarillas, tarjetas_rojas, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [r.equipo_id, r.partido_api_id, r.goles_favor, r.goles_contra, r.xg_favor, r.xg_contra, r.corners, r.tarjetas_amarillas, r.tarjetas_rojas, r.fecha],
  }))

  // 5. predicciones (solo la mas reciente por partido para no saturar)
  console.log("[migrate] Migrando predicciones (ultima por partido)...")
  const preds = local.prepare(`
    SELECT p1.* FROM predicciones p1
    INNER JOIN (
      SELECT partido_id, MAX(timestamp) as max_ts FROM predicciones GROUP BY partido_id
    ) p2 ON p1.partido_id = p2.partido_id AND p1.timestamp = p2.max_ts
  `).all() as Record<string, unknown>[]

  const predStmts = preds.map((r) => ({
    sql: `INSERT OR IGNORE INTO predicciones (partido_id, timestamp, mercados_json, goleadores_json) VALUES (?, ?, ?, ?)`,
    args: [r.partido_id, r.timestamp, r.mercados_json, r.goleadores_json],
  }))
  if (predStmts.length > 0) {
    const BATCH = 50
    for (let i = 0; i < predStmts.length; i += BATCH) {
      await remote.batch(predStmts.slice(i, i + BATCH) as Parameters<typeof remote.batch>[0], "write")
    }
  }
  console.log(`[migrate]   predicciones: ${preds.length} filas (ultima por partido)`)

  local.close()
  console.log("\n[migrate] ✓ Migración completa.")
}

main().catch((e) => { console.error(e); process.exit(1) })
