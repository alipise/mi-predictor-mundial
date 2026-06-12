import type { Jugador } from "@/types"

export function probGol(jugador: Jugador, lambdaEquipo: number, minutosEsperados = 80): number {
  // Expected goals for this player in this match
  const expectedGols = (jugador.tasaGolesPor90 * minutosEsperados) / 90
  // P(at least 1 goal) via Poisson: 1 - P(0) = 1 - e^(-lambda_player)
  // lambda_player scales with the team's expected goals
  const lambdaJugador = expectedGols * lambdaEquipo
  return Math.min(1 - Math.exp(-lambdaJugador), 0.99)
}

export function rankearGoleadores(
  jugadores: Jugador[],
  lambdaEquipo: number,
  top = 5
): Array<{ jugadorId: number; nombre: string; probabilidad: number }> {
  return jugadores
    .map((j) => ({ jugadorId: j.id, nombre: j.nombre, probabilidad: probGol(j, lambdaEquipo) }))
    .sort((a, b) => b.probabilidad - a.probabilidad)
    .slice(0, top)
}
