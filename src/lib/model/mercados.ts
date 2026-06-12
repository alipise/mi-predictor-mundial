export type Matriz = number[][]

export function resultado1x2(m: Matriz) {
  let local = 0, empate = 0, visitante = 0
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < m[i].length; j++) {
      if (i > j) local += m[i][j]
      else if (i === j) empate += m[i][j]
      else visitante += m[i][j]
    }
  return { local, empate, visitante }
}

export function totalGoles(m: Matriz, linea: number) {
  let over = 0, under = 0
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < m[i].length; j++) {
      if (i + j > linea) over += m[i][j]
      else under += m[i][j]
    }
  return { over, under }
}

export function ambosMArcan(m: Matriz) {
  let si = 0
  for (let i = 1; i < m.length; i++)
    for (let j = 1; j < m[i].length; j++)
      si += m[i][j]
  return { si, no: 1 - si }
}

export function golesEquipo(m: Matriz, equipo: "local" | "visitante", linea: number) {
  let over = 0, under = 0
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < m[i].length; j++) {
      const g = equipo === "local" ? i : j
      if (g > linea) over += m[i][j]
      else under += m[i][j]
    }
  return { over, under }
}

// Returns the most probable score conditioned on the expected winner zone.
// If local is favored, search only i > j cells; if visitante, only j > i; if draw, only i === j.
// Falls back to global max if no qualifying cell is found.
export function marcadorMasProbable(
  m: Matriz,
  r1x2?: { local: number; empate: number; visitante: number }
) {
  type Zone = "local" | "empate" | "visitante"
  let zone: Zone = "local"
  if (r1x2) {
    const max = Math.max(r1x2.local, r1x2.empate, r1x2.visitante)
    if (r1x2.empate === max) zone = "empate"
    else if (r1x2.visitante === max) zone = "visitante"
  }

  const inZone = (i: number, j: number) =>
    zone === "local" ? i > j : zone === "visitante" ? j > i : i === j

  let maxP = 0, li = 0, lj = 0
  // First pass: search within predicted-winner zone
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < m[i].length; j++)
      if (inZone(i, j) && m[i][j] > maxP) { maxP = m[i][j]; li = i; lj = j }

  // Fallback: global max (no r1x2 provided or empty zone)
  if (maxP === 0)
    for (let i = 0; i < m.length; i++)
      for (let j = 0; j < m[i].length; j++)
        if (m[i][j] > maxP) { maxP = m[i][j]; li = i; lj = j }

  return { local: li, visitante: lj, probabilidad: maxP }
}

// Poisson CDF (sum of PMF from 0 to k)
function poissonCdf(lambda: number, k: number): number {
  let sum = 0, term = Math.exp(-lambda)
  for (let i = 0; i <= k; i++) {
    sum += term
    term *= lambda / (i + 1)
  }
  return Math.min(sum, 1)
}

export function marketLinea(mediaTotal: number, lineas: number[]) {
  return Object.fromEntries(
    lineas.map((l) => [
      l.toString(),
      { over: 1 - poissonCdf(mediaTotal, Math.floor(l)), under: poissonCdf(mediaTotal, Math.floor(l)) },
    ])
  )
}

// Returns the 6x6 submatrix (0-0 to 5-5) for heatmap display.
// Shows goleada territory (4-0, 5-0, etc.) that the UI must render.
export function matrizDisplay(m: Matriz): number[][] {
  return m.slice(0, 6).map((row) => row.slice(0, 6))
}
