import { getDb } from "@/lib/db"
import { initSchema } from "@/lib/db/schema"

async function main() {
  await initSchema()
  const db = getDb()

  const rs = await db.execute(`
    SELECT el.nombre || ' vs ' || ev.nombre AS partido, p.mercados_json
    FROM predicciones p
    JOIN (
      SELECT partido_id, MAX(timestamp) AS ts FROM predicciones GROUP BY partido_id
    ) last ON last.partido_id = p.partido_id AND last.ts = p.timestamp
    JOIN partidos pa ON pa.id = p.partido_id
    JOIN equipos el ON el.id = pa.equipo_local_id
    JOIN equipos ev ON ev.id = pa.equipo_visitante_id
    ORDER BY pa.fecha_utc
  `)

  type Row = { local: number; visitante: number; prob: number; margen: number }
  const goleadasMasProb: { partido: string; score: string; prob: number }[] = []
  const topMargen: { partido: string; score: string; prob: number }[] = []

  for (const row of rs.rows) {
    const mercados = JSON.parse(row.mercados_json as string)
    const marcador = mercados.find((m: any) => m.mercado === "marcador_probable")
    const matriz = mercados.find((m: any) => m.mercado === "matriz_display")

    if (!marcador) continue
    const scoreKey = Object.keys(marcador.probabilidades)[0]
    const [l, v] = scoreKey.split("-").map(Number)
    const margen = Math.abs(l - v)

    if (margen > 3) {
      goleadasMasProb.push({
        partido: row.partido as string,
        score: scoreKey,
        prob: Object.values(marcador.probabilidades)[0] as number,
      })
    }

    // Also collect best individual goleada cell from matrix
    if (matriz) {
      let bestGoleada: Row | null = null
      for (const [score, prob] of Object.entries(matriz.probabilidades as Record<string, number>)) {
        const [gl, gv] = score.split("-").map(Number)
        const mg = gl - gv
        if (mg >= 4) {
          if (!bestGoleada || (prob as number) > bestGoleada.prob) {
            bestGoleada = { local: gl, visitante: gv, prob: prob as number, margen: mg }
          }
        }
      }
      if (bestGoleada && bestGoleada.prob > 0.03) {
        topMargen.push({
          partido: row.partido as string,
          score: `${bestGoleada.local}-${bestGoleada.visitante}`,
          prob: bestGoleada.prob,
        })
      }
    }
  }

  console.log("\n=== PARTIDOS CON MARCADOR PROBABLE > 3-0 ===")
  if (goleadasMasProb.length === 0) {
    console.log("Ninguno — el modo estadístico nunca supera 3 goles de diferencia")
  } else {
    for (const g of goleadasMasProb) {
      console.log(`  ${g.partido}: ${g.score}  (${(g.prob * 100).toFixed(1)}%)`)
    }
  }

  console.log("\n=== PARTIDOS CON CELDA 4-0 o superior AL >3% EN LA MATRIZ ===")
  topMargen.sort((a, b) => b.prob - a.prob)
  for (const g of topMargen) {
    console.log(`  ${g.partido}: ${g.score}  (${(g.prob * 100).toFixed(1)}%)`)
  }

  // Full goleada summary for the best 10 matchups
  console.log("\n=== TOP 10 PARTIDOS POR PROB DE GOLEADA (≥4 GOLES DIFERENCIA) ===")
  const resumen: { partido: string; p3: number; p4: number; p5: number; modo: string }[] = []
  for (const row of rs.rows) {
    const mercados = JSON.parse(row.mercados_json as string)
    const marcador = mercados.find((m: any) => m.mercado === "marcador_probable")
    const matriz = mercados.find((m: any) => m.mercado === "matriz_display")
    if (!marcador || !matriz) continue
    const scoreKey = Object.keys(marcador.probabilidades)[0]
    let p3 = 0, p4 = 0, p5 = 0
    for (const [score, prob] of Object.entries(matriz.probabilidades as Record<string, number>)) {
      const [gl, gv] = score.split("-").map(Number)
      const mg = gl - gv
      if (Math.abs(gl - gv) >= 3) p3 += prob as number
      if (Math.abs(gl - gv) >= 4) p4 += prob as number
      if (Math.abs(gl - gv) >= 5) p5 += prob as number
    }
    resumen.push({ partido: row.partido as string, p3, p4, p5, modo: scoreKey })
  }
  resumen.sort((a, b) => b.p4 - a.p4)
  for (const r of resumen.slice(0, 10)) {
    console.log(
      `  ${r.partido.padEnd(30)} modo=${r.modo}  P(dif≥3)=${(r.p3*100).toFixed(1)}%  P(dif≥4)=${(r.p4*100).toFixed(1)}%  P(dif≥5)=${(r.p5*100).toFixed(1)}%`
    )
  }
}

main().catch(console.error)
