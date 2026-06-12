export function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0
  let logP = -lambda + k * Math.log(lambda)
  for (let i = 1; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

// Returns P[i][j] = P(home scores i, away scores j), independent Poisson
export function bivariatePoisson(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 6
): number[][] {
  const matrix: number[][] = []
  for (let i = 0; i <= maxGoals; i++) {
    matrix[i] = []
    for (let j = 0; j <= maxGoals; j++) {
      matrix[i][j] = poissonPmf(lambdaHome, i) * poissonPmf(lambdaAway, j)
    }
  }
  return matrix
}
