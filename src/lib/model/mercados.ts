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

// Hybrid mode: balances statistical accuracy with intuitive readability.
//
// - Competitive match (neither team exceeds 46% win probability):
//   Uses the GLOBAL mode — the single highest-probability cell across the whole
//   matrix. 1-1 naturally surfaces here because for two ~equal Poisson processes
//   it genuinely is the most likely individual score.
//
// - Clear favourite (one team > 46% win probability):
//   Uses ZONE-CONDITIONED mode — searches only within the predicted winner's cells
//   (i>j for local, j>i for visitante, i==j for draw). This avoids the
//   counterintuitive situation where France 54% vs Senegal is headlined "1-1".
//
// The 46% threshold comes from empirical calibration on the 72 WC2026 fixtures:
// it gives ~9 draws (13%), eliminating false draws for clear favourites while
// correctly surfacing them for genuinely even matchups.
export function marcadorMasProbable(
  m: Matriz,
  r1x2?: { local: number; empate: number; visitante: number }
) {
  // Helper: global mode (unconditional argmax)
  const globalMode = (() => {
    let maxP = 0, li = 0, lj = 0
    for (let i = 0; i < m.length; i++)
      for (let j = 0; j < m[i].length; j++)
        if (m[i][j] > maxP) { maxP = m[i][j]; li = i; lj = j }
    return { local: li, visitante: lj, probabilidad: maxP }
  })()

  // No r1x2 available: fall back to global mode
  if (!r1x2) return globalMode

  const maxWinner = Math.max(r1x2.local, r1x2.visitante)

  // Competitive match: global mode (draws can surface naturally)
  if (maxWinner <= 0.46) return globalMode

  // Clear favourite: zone-conditioned mode
  type Zone = "local" | "empate" | "visitante"
  const maxAll = Math.max(r1x2.local, r1x2.empate, r1x2.visitante)
  let zone: Zone = "local"
  if (r1x2.empate === maxAll) zone = "empate"
  else if (r1x2.visitante === maxAll) zone = "visitante"

  const inZone = (i: number, j: number) =>
    zone === "local" ? i > j : zone === "visitante" ? j > i : i === j

  let maxP = 0, li = 0, lj = 0
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < m[i].length; j++)
      if (inZone(i, j) && m[i][j] > maxP) { maxP = m[i][j]; li = i; lj = j }

  return maxP > 0 ? { local: li, visitante: lj, probabilidad: maxP } : globalMode
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
