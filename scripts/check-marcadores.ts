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
    ORDER BY pa.fecha_utc
  `)

  let countLocal = 0, countEmpate = 0, countVisitante = 0
  const empates: string[] = []
  const modos: Record<string, number> = {}

  for (const row of rs.rows) {
    const mercados = JSON.parse(row.mercados_json as string)
    const r1x2 = mercados.find((m: any) => m.mercado === "resultado_1x2")
    const marcador = mercados.find((m: any) => m.mercado === "marcador_probable")
    if (!r1x2 || !marcador) continue

    const { local, empate, visitante } = r1x2.probabilidades
    const max = Math.max(local, empate, visitante)
    const scoreKey = Object.keys(marcador.probabilidades)[0]
    const [l, v] = scoreKey.split("-").map(Number)

    modos[scoreKey] = (modos[scoreKey] ?? 0) + 1

    if (empate === max) {
      countEmpate++
      empates.push(`${row.partido}: ${scoreKey}  1x2=[${(local*100).toFixed(0)}% ${(empate*100).toFixed(0)}% ${(visitante*100).toFixed(0)}%]`)
    } else if (local === max) {
      countLocal++
    } else {
      countVisitante++
    }

    // Detect mismatches: marcador zone vs r1x2 zone
    const scoreZone = l > v ? "local" : l === v ? "empate" : "visitante"
    const r1x2Zone = empate === max ? "empate" : local === max ? "local" : "visitante"
    if (scoreZone !== r1x2Zone) {
      console.log(`MISMATCH ${row.partido}: r1x2zone=${r1x2Zone} pero marcador=${scoreKey} (zone=${scoreZone})`)
    }
  }

  console.log(`\n=== DISTRIBUCIÓN ZONA GANADORA ===`)
  console.log(`Local gana:    ${countLocal}`)
  console.log(`Empate:        ${countEmpate}`)
  console.log(`Visitante:     ${countVisitante}`)
  console.log(`Total:         ${countLocal + countEmpate + countVisitante}`)

  console.log(`\n=== PARTIDOS CON EMPATE COMO MODO ===`)
  for (const e of empates) console.log("  " + e)

  console.log(`\n=== FRECUENCIA DE MARCADORES PROBABLES ===`)
  const sorted = Object.entries(modos).sort((a, b) => b[1] - a[1])
  for (const [score, count] of sorted) {
    console.log(`  ${score.padEnd(6)} : ${count} partidos`)
  }

  // Check draw probability distribution
  console.log(`\n=== TOP 15 PARTIDOS POR PROB DE EMPATE ===`)
  const drawProbs: { partido: string; pEmpate: number; pLocal: number; pVisit: number }[] = []
  for (const row of rs.rows) {
    const mercados = JSON.parse(row.mercados_json as string)
    const r1x2 = mercados.find((m: any) => m.mercado === "resultado_1x2")
    if (!r1x2) continue
    drawProbs.push({
      partido: row.partido as string,
      pEmpate: r1x2.probabilidades.empate,
      pLocal: r1x2.probabilidades.local,
      pVisit: r1x2.probabilidades.visitante,
    })
  }
  drawProbs.sort((a, b) => b.pEmpate - a.pEmpate)
  for (const d of drawProbs.slice(0, 15)) {
    console.log(
      `  ${d.partido.padEnd(20)} 1x2: L=${(d.pLocal*100).toFixed(0)}% E=${(d.pEmpate*100).toFixed(0)}% V=${(d.pVisit*100).toFixed(0)}%`
    )
  }
}

main().catch(console.error)
