// Dixon-Coles (1997) correction for low-scoring results.
// rho < 0 adds positive correlation between home and away goals at 0-0/1-0/0-1/1-1.
function tau(i: number, j: number, lh: number, la: number, rho: number): number {
  if (i === 0 && j === 0) return 1 - lh * la * rho
  if (i === 1 && j === 0) return 1 + la * rho
  if (i === 0 && j === 1) return 1 + lh * rho
  if (i === 1 && j === 1) return 1 - rho
  return 1
}

export function applyDixonColes(
  matrix: number[][],
  lambdaHome: number,
  lambdaAway: number,
  rho = -0.13
): number[][] {
  const corrected = matrix.map((row, i) =>
    row.map((p, j) => p * tau(i, j, lambdaHome, lambdaAway, rho))
  )
  const total = corrected.flat().reduce((a, b) => a + b, 0)
  return corrected.map((row) => row.map((p) => p / total))
}
