import { getDb } from "."

export async function initSchema() {
  const db = getDb()
  await db.executeMultiple(`
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
      estadio TEXT NOT NULL
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

    CREATE INDEX IF NOT EXISTS idx_predicciones_partido
      ON predicciones(partido_id, timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_estadisticas_equipo
      ON estadisticas_equipo(equipo_id, fecha DESC);
  `)

  // Migrations (idempotent — silently skip if column already exists)
  await db.execute("ALTER TABLE partidos ADD COLUMN goles_local INTEGER").catch(() => {})
  await db.execute("ALTER TABLE partidos ADD COLUMN goles_visitante INTEGER").catch(() => {})
}
