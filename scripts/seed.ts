/**
 * Seed script for the 2026 World Cup.
 * With RAPIDAPI_KEY set: fetches teams and fixture from API-Football.
 * Without it: uses real 2026 group draw data (December 5, 2025 draw).
 *
 * Run: pnpm seed
 */
import { initSchema } from "@/lib/db/schema"
import { getDb } from "@/lib/db"
import { footballApi } from "@/lib/api/football"

const EQUIPOS_STATIC = [
  // Group A
  { id: 101, nombre: "Mexico",               codigo: "MEX", grupo: "A" },
  { id: 102, nombre: "South Africa",         codigo: "RSA", grupo: "A" },
  { id: 103, nombre: "Korea Republic",       codigo: "KOR", grupo: "A" },
  { id: 104, nombre: "Czech Republic",       codigo: "CZE", grupo: "A" },
  // Group B
  { id: 105, nombre: "Canada",               codigo: "CAN", grupo: "B" },
  { id: 106, nombre: "Switzerland",          codigo: "SUI", grupo: "B" },
  { id: 107, nombre: "Qatar",               codigo: "QAT", grupo: "B" },
  { id: 108, nombre: "Bosnia-Herzegovina",   codigo: "BIH", grupo: "B" },
  // Group C
  { id: 109, nombre: "Brazil",              codigo: "BRA", grupo: "C" },
  { id: 110, nombre: "Morocco",             codigo: "MAR", grupo: "C" },
  { id: 111, nombre: "Haiti",               codigo: "HAI", grupo: "C" },
  { id: 112, nombre: "Scotland",            codigo: "SCO", grupo: "C" },
  // Group D
  { id: 113, nombre: "USA",                 codigo: "USA", grupo: "D" },
  { id: 114, nombre: "Paraguay",            codigo: "PAR", grupo: "D" },
  { id: 115, nombre: "Australia",           codigo: "AUS", grupo: "D" },
  { id: 116, nombre: "Turkey",              codigo: "TUR", grupo: "D" },
  // Group E
  { id: 117, nombre: "Germany",             codigo: "GER", grupo: "E" },
  { id: 118, nombre: "Curacao",             codigo: "CUW", grupo: "E" },
  { id: 119, nombre: "Ivory Coast",         codigo: "CIV", grupo: "E" },
  { id: 120, nombre: "Ecuador",             codigo: "ECU", grupo: "E" },
  // Group F
  { id: 121, nombre: "Netherlands",         codigo: "NED", grupo: "F" },
  { id: 122, nombre: "Japan",               codigo: "JPN", grupo: "F" },
  { id: 123, nombre: "Sweden",              codigo: "SWE", grupo: "F" },
  { id: 124, nombre: "Tunisia",             codigo: "TUN", grupo: "F" },
  // Group G
  { id: 125, nombre: "Belgium",             codigo: "BEL", grupo: "G" },
  { id: 126, nombre: "Egypt",               codigo: "EGY", grupo: "G" },
  { id: 127, nombre: "Iran",                codigo: "IRN", grupo: "G" },
  { id: 128, nombre: "New Zealand",         codigo: "NZL", grupo: "G" },
  // Group H
  { id: 129, nombre: "Spain",               codigo: "ESP", grupo: "H" },
  { id: 130, nombre: "Cape Verde",          codigo: "CPV", grupo: "H" },
  { id: 131, nombre: "Saudi Arabia",        codigo: "KSA", grupo: "H" },
  { id: 132, nombre: "Uruguay",             codigo: "URU", grupo: "H" },
  // Group I
  { id: 133, nombre: "France",              codigo: "FRA", grupo: "I" },
  { id: 134, nombre: "Senegal",             codigo: "SEN", grupo: "I" },
  { id: 135, nombre: "Iraq",                codigo: "IRQ", grupo: "I" },
  { id: 136, nombre: "Norway",              codigo: "NOR", grupo: "I" },
  // Group J
  { id: 137, nombre: "Argentina",           codigo: "ARG", grupo: "J" },
  { id: 138, nombre: "Algeria",             codigo: "ALG", grupo: "J" },
  { id: 139, nombre: "Austria",             codigo: "AUT", grupo: "J" },
  { id: 140, nombre: "Jordan",              codigo: "JOR", grupo: "J" },
  // Group K
  { id: 141, nombre: "Portugal",            codigo: "POR", grupo: "K" },
  { id: 142, nombre: "DR Congo",            codigo: "COD", grupo: "K" },
  { id: 143, nombre: "Uzbekistan",          codigo: "UZB", grupo: "K" },
  { id: 144, nombre: "Colombia",            codigo: "COL", grupo: "K" },
  // Group L
  { id: 145, nombre: "England",             codigo: "ENG", grupo: "L" },
  { id: 146, nombre: "Croatia",             codigo: "CRO", grupo: "L" },
  { id: 147, nombre: "Ghana",               codigo: "GHA", grupo: "L" },
  { id: 148, nombre: "Panama",              codigo: "PAN", grupo: "L" },
]

const PARTIDOS_STATIC = [
  // GROUP A
  { id: 1,  equipoLocalId: 101, equipoVisitanteId: 102, fechaUtc: "2026-06-11T20:00:00Z", estadio: "Estadio Azteca",        grupo: "A" },
  { id: 2,  equipoLocalId: 103, equipoVisitanteId: 104, fechaUtc: "2026-06-12T03:00:00Z", estadio: "Estadio Akron",         grupo: "A" },
  { id: 3,  equipoLocalId: 104, equipoVisitanteId: 102, fechaUtc: "2026-06-18T16:00:00Z", estadio: "Mercedes-Benz Stadium", grupo: "A" },
  { id: 4,  equipoLocalId: 101, equipoVisitanteId: 103, fechaUtc: "2026-06-19T02:00:00Z", estadio: "Estadio Akron",         grupo: "A" },
  { id: 5,  equipoLocalId: 104, equipoVisitanteId: 101, fechaUtc: "2026-06-25T02:00:00Z", estadio: "Estadio Azteca",        grupo: "A" },
  { id: 6,  equipoLocalId: 102, equipoVisitanteId: 103, fechaUtc: "2026-06-25T02:00:00Z", estadio: "Estadio BBVA",          grupo: "A" },
  // GROUP B
  { id: 7,  equipoLocalId: 105, equipoVisitanteId: 108, fechaUtc: "2026-06-12T19:00:00Z", estadio: "BMO Field",             grupo: "B" },
  { id: 8,  equipoLocalId: 107, equipoVisitanteId: 106, fechaUtc: "2026-06-13T20:00:00Z", estadio: "Levi's Stadium",        grupo: "B" },
  { id: 9,  equipoLocalId: 106, equipoVisitanteId: 108, fechaUtc: "2026-06-18T22:00:00Z", estadio: "SoFi Stadium",          grupo: "B" },
  { id: 10, equipoLocalId: 105, equipoVisitanteId: 107, fechaUtc: "2026-06-19T01:00:00Z", estadio: "BC Place",              grupo: "B" },
  { id: 11, equipoLocalId: 106, equipoVisitanteId: 105, fechaUtc: "2026-06-24T22:00:00Z", estadio: "BC Place",              grupo: "B" },
  { id: 12, equipoLocalId: 108, equipoVisitanteId: 107, fechaUtc: "2026-06-24T22:00:00Z", estadio: "Lumen Field",           grupo: "B" },
  // GROUP C
  { id: 13, equipoLocalId: 109, equipoVisitanteId: 110, fechaUtc: "2026-06-13T23:00:00Z", estadio: "MetLife Stadium",       grupo: "C" },
  { id: 14, equipoLocalId: 111, equipoVisitanteId: 112, fechaUtc: "2026-06-14T02:00:00Z", estadio: "Gillette Stadium",      grupo: "C" },
  { id: 15, equipoLocalId: 112, equipoVisitanteId: 110, fechaUtc: "2026-06-19T22:00:00Z", estadio: "Gillette Stadium",      grupo: "C" },
  { id: 16, equipoLocalId: 109, equipoVisitanteId: 111, fechaUtc: "2026-06-20T00:30:00Z", estadio: "Lincoln Financial Field",grupo: "C" },
  { id: 17, equipoLocalId: 112, equipoVisitanteId: 109, fechaUtc: "2026-06-24T22:00:00Z", estadio: "Hard Rock Stadium",     grupo: "C" },
  { id: 18, equipoLocalId: 110, equipoVisitanteId: 111, fechaUtc: "2026-06-24T22:00:00Z", estadio: "Lincoln Financial Field",grupo: "C" },
  // GROUP D
  { id: 19, equipoLocalId: 113, equipoVisitanteId: 114, fechaUtc: "2026-06-12T22:00:00Z", estadio: "SoFi Stadium",          grupo: "D" },
  { id: 20, equipoLocalId: 115, equipoVisitanteId: 116, fechaUtc: "2026-06-14T23:00:00Z", estadio: "AT&T Stadium",          grupo: "D" },
  { id: 21, equipoLocalId: 113, equipoVisitanteId: 116, fechaUtc: "2026-06-20T18:00:00Z", estadio: "NRG Stadium",           grupo: "D" },
  { id: 22, equipoLocalId: 115, equipoVisitanteId: 114, fechaUtc: "2026-06-20T21:00:00Z", estadio: "Arrowhead Stadium",     grupo: "D" },
  { id: 23, equipoLocalId: 113, equipoVisitanteId: 115, fechaUtc: "2026-06-25T22:00:00Z", estadio: "SoFi Stadium",          grupo: "D" },
  { id: 24, equipoLocalId: 114, equipoVisitanteId: 116, fechaUtc: "2026-06-25T22:00:00Z", estadio: "Arrowhead Stadium",     grupo: "D" },
  // GROUP E
  { id: 25, equipoLocalId: 117, equipoVisitanteId: 118, fechaUtc: "2026-06-14T18:00:00Z", estadio: "NRG Stadium",           grupo: "E" },
  { id: 26, equipoLocalId: 119, equipoVisitanteId: 120, fechaUtc: "2026-06-15T00:00:00Z", estadio: "Lincoln Financial Field",grupo: "E" },
  { id: 27, equipoLocalId: 117, equipoVisitanteId: 119, fechaUtc: "2026-06-21T18:00:00Z", estadio: "AT&T Stadium",          grupo: "E" },
  { id: 28, equipoLocalId: 118, equipoVisitanteId: 120, fechaUtc: "2026-06-21T21:00:00Z", estadio: "Empower Field",         grupo: "E" },
  { id: 29, equipoLocalId: 117, equipoVisitanteId: 120, fechaUtc: "2026-06-26T22:00:00Z", estadio: "NRG Stadium",           grupo: "E" },
  { id: 30, equipoLocalId: 118, equipoVisitanteId: 119, fechaUtc: "2026-06-26T22:00:00Z", estadio: "Mercedes-Benz Stadium", grupo: "E" },
  // GROUP F
  { id: 31, equipoLocalId: 121, equipoVisitanteId: 122, fechaUtc: "2026-06-14T21:00:00Z", estadio: "AT&T Stadium",          grupo: "F" },
  { id: 32, equipoLocalId: 123, equipoVisitanteId: 124, fechaUtc: "2026-06-15T03:00:00Z", estadio: "Estadio Akron",         grupo: "F" },
  { id: 33, equipoLocalId: 121, equipoVisitanteId: 123, fechaUtc: "2026-06-21T22:00:00Z", estadio: "Lumen Field",           grupo: "F" },
  { id: 34, equipoLocalId: 122, equipoVisitanteId: 124, fechaUtc: "2026-06-22T01:00:00Z", estadio: "Gillette Stadium",      grupo: "F" },
  { id: 35, equipoLocalId: 121, equipoVisitanteId: 124, fechaUtc: "2026-06-27T01:00:00Z", estadio: "AT&T Stadium",          grupo: "F" },
  { id: 36, equipoLocalId: 122, equipoVisitanteId: 123, fechaUtc: "2026-06-27T01:00:00Z", estadio: "Levi's Stadium",        grupo: "F" },
  // GROUP G
  { id: 37, equipoLocalId: 125, equipoVisitanteId: 126, fechaUtc: "2026-06-15T22:00:00Z", estadio: "Lumen Field",           grupo: "G" },
  { id: 38, equipoLocalId: 127, equipoVisitanteId: 128, fechaUtc: "2026-06-16T04:00:00Z", estadio: "SoFi Stadium",          grupo: "G" },
  { id: 39, equipoLocalId: 125, equipoVisitanteId: 127, fechaUtc: "2026-06-22T17:00:00Z", estadio: "Hard Rock Stadium",     grupo: "G" },
  { id: 40, equipoLocalId: 126, equipoVisitanteId: 128, fechaUtc: "2026-06-22T20:00:00Z", estadio: "MetLife Stadium",       grupo: "G" },
  { id: 41, equipoLocalId: 125, equipoVisitanteId: 128, fechaUtc: "2026-06-27T21:00:00Z", estadio: "Lumen Field",           grupo: "G" },
  { id: 42, equipoLocalId: 126, equipoVisitanteId: 127, fechaUtc: "2026-06-27T21:00:00Z", estadio: "AT&T Stadium",          grupo: "G" },
  // GROUP H
  { id: 43, equipoLocalId: 129, equipoVisitanteId: 130, fechaUtc: "2026-06-15T17:00:00Z", estadio: "Mercedes-Benz Stadium", grupo: "H" },
  { id: 44, equipoLocalId: 131, equipoVisitanteId: 132, fechaUtc: "2026-06-15T23:00:00Z", estadio: "Hard Rock Stadium",     grupo: "H" },
  { id: 45, equipoLocalId: 129, equipoVisitanteId: 131, fechaUtc: "2026-06-22T22:00:00Z", estadio: "Arrowhead Stadium",     grupo: "H" },
  { id: 46, equipoLocalId: 130, equipoVisitanteId: 132, fechaUtc: "2026-06-23T01:00:00Z", estadio: "SoFi Stadium",          grupo: "H" },
  { id: 47, equipoLocalId: 129, equipoVisitanteId: 132, fechaUtc: "2026-06-27T22:00:00Z", estadio: "NRG Stadium",           grupo: "H" },
  { id: 48, equipoLocalId: 130, equipoVisitanteId: 131, fechaUtc: "2026-06-27T22:00:00Z", estadio: "Mercedes-Benz Stadium", grupo: "H" },
  // GROUP I
  { id: 49, equipoLocalId: 133, equipoVisitanteId: 134, fechaUtc: "2026-06-16T19:00:00Z", estadio: "MetLife Stadium",       grupo: "I" },
  { id: 50, equipoLocalId: 135, equipoVisitanteId: 136, fechaUtc: "2026-06-16T22:00:00Z", estadio: "Gillette Stadium",      grupo: "I" },
  { id: 51, equipoLocalId: 133, equipoVisitanteId: 135, fechaUtc: "2026-06-23T18:00:00Z", estadio: "Levi's Stadium",        grupo: "I" },
  { id: 52, equipoLocalId: 134, equipoVisitanteId: 136, fechaUtc: "2026-06-23T21:00:00Z", estadio: "Empower Field",         grupo: "I" },
  { id: 53, equipoLocalId: 133, equipoVisitanteId: 136, fechaUtc: "2026-06-28T22:00:00Z", estadio: "Hard Rock Stadium",     grupo: "I" },
  { id: 54, equipoLocalId: 134, equipoVisitanteId: 135, fechaUtc: "2026-06-28T22:00:00Z", estadio: "Lincoln Financial Field",grupo: "I" },
  // GROUP J
  { id: 55, equipoLocalId: 137, equipoVisitanteId: 138, fechaUtc: "2026-06-17T01:00:00Z", estadio: "Arrowhead Stadium",     grupo: "J" },
  { id: 56, equipoLocalId: 139, equipoVisitanteId: 140, fechaUtc: "2026-06-17T01:00:00Z", estadio: "Levi's Stadium",        grupo: "J" },
  { id: 57, equipoLocalId: 137, equipoVisitanteId: 139, fechaUtc: "2026-06-23T22:00:00Z", estadio: "MetLife Stadium",       grupo: "J" },
  { id: 58, equipoLocalId: 138, equipoVisitanteId: 140, fechaUtc: "2026-06-24T01:00:00Z", estadio: "BC Place",              grupo: "J" },
  { id: 59, equipoLocalId: 137, equipoVisitanteId: 140, fechaUtc: "2026-06-29T01:00:00Z", estadio: "Arrowhead Stadium",     grupo: "J" },
  { id: 60, equipoLocalId: 138, equipoVisitanteId: 139, fechaUtc: "2026-06-29T01:00:00Z", estadio: "NRG Stadium",           grupo: "J" },
  // GROUP K
  { id: 61, equipoLocalId: 141, equipoVisitanteId: 142, fechaUtc: "2026-06-17T17:00:00Z", estadio: "NRG Stadium",           grupo: "K" },
  { id: 62, equipoLocalId: 143, equipoVisitanteId: 144, fechaUtc: "2026-06-18T01:00:00Z", estadio: "Estadio Azteca",        grupo: "K" },
  { id: 63, equipoLocalId: 141, equipoVisitanteId: 143, fechaUtc: "2026-06-24T17:00:00Z", estadio: "SoFi Stadium",          grupo: "K" },
  { id: 64, equipoLocalId: 142, equipoVisitanteId: 144, fechaUtc: "2026-06-24T20:00:00Z", estadio: "AT&T Stadium",          grupo: "K" },
  { id: 65, equipoLocalId: 141, equipoVisitanteId: 144, fechaUtc: "2026-06-29T22:00:00Z", estadio: "Gillette Stadium",      grupo: "K" },
  { id: 66, equipoLocalId: 142, equipoVisitanteId: 143, fechaUtc: "2026-06-29T22:00:00Z", estadio: "BMO Field",             grupo: "K" },
  // GROUP L
  { id: 67, equipoLocalId: 145, equipoVisitanteId: 146, fechaUtc: "2026-06-17T20:00:00Z", estadio: "AT&T Stadium",          grupo: "L" },
  { id: 68, equipoLocalId: 147, equipoVisitanteId: 148, fechaUtc: "2026-06-17T23:00:00Z", estadio: "BMO Field",             grupo: "L" },
  { id: 69, equipoLocalId: 145, equipoVisitanteId: 147, fechaUtc: "2026-06-24T22:00:00Z", estadio: "MetLife Stadium",       grupo: "L" },
  { id: 70, equipoLocalId: 146, equipoVisitanteId: 148, fechaUtc: "2026-06-25T01:00:00Z", estadio: "Lumen Field",           grupo: "L" },
  { id: 71, equipoLocalId: 145, equipoVisitanteId: 148, fechaUtc: "2026-06-30T01:00:00Z", estadio: "Levi's Stadium",        grupo: "L" },
  { id: 72, equipoLocalId: 146, equipoVisitanteId: 147, fechaUtc: "2026-06-30T01:00:00Z", estadio: "Lincoln Financial Field",grupo: "L" },
]

async function seedStatic() {
  const db = getDb()
  const equipoStmts = EQUIPOS_STATIC.map((eq) => ({
    sql: `INSERT OR IGNORE INTO equipos (id, nombre, codigo, grupo, logo_url) VALUES (?, ?, ?, ?, NULL)`,
    args: [eq.id, eq.nombre, eq.codigo, eq.grupo] as (string | number | null)[],
  }))
  const partidoStmts = PARTIDOS_STATIC.map((p) => ({
    sql: `INSERT OR IGNORE INTO partidos (id, fase, grupo, equipo_local_id, equipo_visitante_id, fecha_utc, estadio) VALUES (?, 'grupo', ?, ?, ?, ?, ?)`,
    args: [p.id, p.grupo, p.equipoLocalId, p.equipoVisitanteId, p.fechaUtc, p.estadio] as (string | number | null)[],
  }))
  await db.batch([...equipoStmts, ...partidoStmts], "write")
  console.log(`[seed] ${EQUIPOS_STATIC.length} equipos y ${PARTIDOS_STATIC.length} partidos insertados.`)
}

async function seedFromApi() {
  console.log("[seed] Fetching teams from API-Football...")
  const db = getDb()
  const [teams, fixtures] = await Promise.all([footballApi.getTeams(), footballApi.getFixtures()])
  console.log(`[seed] ${teams.length} equipos, ${fixtures.length} partidos recibidos.`)

  const equipoStmts = teams.map((t) => ({
    sql: `INSERT OR REPLACE INTO equipos (id, nombre, codigo, grupo, logo_url) VALUES (?, ?, ?, 'TBD', ?)`,
    args: [t.team.id, t.team.name, t.team.code ?? t.team.name.slice(0, 3).toUpperCase(), t.team.logo] as (string | number | null)[],
  }))
  const partidoStmts = fixtures.map((f) => {
    const round = f.league.round?.toLowerCase() ?? ""
    const fase =
      round.includes("group") ? "grupo" :
      round.includes("round of 16") ? "octavos" :
      round.includes("quarter") ? "cuartos" :
      round.includes("semi") ? "semis" : "final"
    return {
      sql: `INSERT OR REPLACE INTO partidos (id, fase, grupo, equipo_local_id, equipo_visitante_id, fecha_utc, estadio) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [f.fixture.id, fase, f.league.group ?? null, f.teams.home.id, f.teams.away.id, f.fixture.date, f.fixture.venue.name] as (string | number | null)[],
    }
  })
  await db.batch([...equipoStmts, ...partidoStmts], "write")
  console.log("[seed] Datos de API insertados.")
}

async function main() {
  console.log("[seed] Iniciando...")
  await initSchema()
  if (process.env.RAPIDAPI_KEY) {
    await seedFromApi().catch((err) => {
      console.warn(`[seed] API falló (${err.message}), usando datos estáticos.`)
      return seedStatic()
    })
  } else {
    console.log("[seed] Sin RAPIDAPI_KEY — usando datos oficiales del sorteo (5 dic 2025).")
    await seedStatic()
  }
  console.log("[seed] Listo.")
}

main().catch((err) => { console.error(err); process.exit(1) })
