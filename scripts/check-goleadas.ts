import { getDb } from "@/lib/db"
import { initSchema } from "@/lib/db/schema"

async function main() {
  await initSchema()
  const db = getDb()

const rs = await db.execute(`
  SELECT el.codigo || ' vs ' || ev.codigo AS partido, p.mercados_json
  FROM predicciones p
  JOIN (
    SELECT partido_id, MAX(timestamp) AS ts FROM predicciones GROUP BY partido_id
  ) last ON last.partido_id = p.partido_id AND last.ts = p.timestamp
  JOIN partidos pa ON pa.id = p.partido_id
  JOIN equipos el ON el.id = pa.equipo_local_id
  JOIN equipos ev ON ev.id = pa.equipo_visitante_id
  WHERE pa.id IN (13, 55, 25, 43, 49)
`)

for (const row of rs.rows) {
  const mercados = JSON.parse(row.mercados_json as string)
  const marcador = mercados.find((m: any) => m.mercado === "marcador_probable")
  const total35 = mercados.find((m: any) => m.mercado === "total_goles" && m.linea === 3.5)
  const matriz = mercados.find((m: any) => m.mercado === "matriz_display")

  // Sum goleada probabilities from matrix (local wins by 3+)
  let pGoleada3 = 0, pGoleada4 = 0, pGoleada5 = 0
  if (matriz) {
    for (const [score, prob] of Object.entries(matriz.probabilidades as Record<string, number>)) {
      const [l, v] = score.split("-").map(Number)
      const diff = l - v
      if (diff >= 3) pGoleada3 += prob
      if (diff >= 4) pGoleada4 += prob
      if (diff >= 5) pGoleada5 += prob
    }
  }

  const score = marcador ? Object.keys(marcador.probabilidades)[0] : "?"
  const pOver35 = total35 ? (total35.probabilidades.over * 100).toFixed(1) : "?"
  console.log(
    `${row.partido}: modo=${score}  over3.5=${pOver35}%` +
    `  P(ganando 3+)=${(pGoleada3*100).toFixed(1)}%` +
    `  P(4+)=${(pGoleada4*100).toFixed(1)}%` +
    `  P(5+)=${(pGoleada5*100).toFixed(1)}%`
  )
}
}

main().catch(console.error)
