import type { Partido, Prediccion, PrediccionMercado, StatsPartido } from "@/types"
import { bivariatePoisson } from "./poisson"
import { applyDixonColes } from "./dixon-coles"
import {
  resultado1x2,
  totalGoles,
  ambosMArcan,
  golesEquipo,
  marcadorMasProbable,
  marketLinea,
  matrizDisplay,
} from "./mercados"
import { rankearGoleadores } from "./goleadores"

const MEDIA_LIGA = 1.35 // media histórica en torneos internacionales finales
const FACTOR_LOCAL = 1.0 // Mundial en sede neutral, sin ventaja de localía

// Base ratings derived from FIFA ranking tiers and recent performance.
// ataque: goals scored relative to league avg (>1 = above avg)
// defensa: goals conceded relative to league avg (<1 = fewer conceded)
// Used only when no historical match stats are available in the DB.
const RATINGS_BASE: Record<number, { ataque: number; defensa: number }> = {
  // Group A
  101: { ataque: 1.25, defensa: 0.90 }, // MEX
  102: { ataque: 0.75, defensa: 1.15 }, // RSA
  103: { ataque: 1.00, defensa: 0.98 }, // KOR
  104: { ataque: 1.00, defensa: 0.95 }, // CZE
  // Group B
  105: { ataque: 1.05, defensa: 0.95 }, // CAN
  106: { ataque: 1.10, defensa: 0.88 }, // SUI
  107: { ataque: 0.80, defensa: 1.10 }, // QAT
  108: { ataque: 0.90, defensa: 1.05 }, // BIH
  // Group C
  109: { ataque: 1.70, defensa: 0.72 }, // BRA
  110: { ataque: 1.20, defensa: 0.82 }, // MAR
  111: { ataque: 0.65, defensa: 1.30 }, // HAI
  112: { ataque: 1.05, defensa: 0.95 }, // SCO
  // Group D
  113: { ataque: 1.10, defensa: 0.90 }, // USA
  114: { ataque: 0.90, defensa: 1.05 }, // PAR
  115: { ataque: 0.95, defensa: 1.00 }, // AUS
  116: { ataque: 1.05, defensa: 0.98 }, // TUR
  // Group E
  117: { ataque: 1.50, defensa: 0.80 }, // GER
  118: { ataque: 0.60, defensa: 1.35 }, // CUW
  119: { ataque: 0.95, defensa: 1.05 }, // CIV
  120: { ataque: 0.95, defensa: 1.05 }, // ECU
  // Group F
  121: { ataque: 1.40, defensa: 0.83 }, // NED
  122: { ataque: 1.10, defensa: 0.90 }, // JPN
  123: { ataque: 1.10, defensa: 0.90 }, // SWE
  124: { ataque: 0.82, defensa: 1.12 }, // TUN
  // Group G
  125: { ataque: 1.35, defensa: 0.85 }, // BEL
  126: { ataque: 0.85, defensa: 1.08 }, // EGY
  127: { ataque: 0.82, defensa: 1.10 }, // IRN
  128: { ataque: 0.68, defensa: 1.28 }, // NZL
  // Group H
  129: { ataque: 1.65, defensa: 0.73 }, // ESP
  130: { ataque: 0.72, defensa: 1.20 }, // CPV
  131: { ataque: 0.88, defensa: 1.08 }, // KSA
  132: { ataque: 1.20, defensa: 0.88 }, // URU
  // Group I
  133: { ataque: 1.70, defensa: 0.72 }, // FRA
  134: { ataque: 1.10, defensa: 0.92 }, // SEN
  135: { ataque: 0.82, defensa: 1.12 }, // IRQ
  136: { ataque: 1.08, defensa: 0.95 }, // NOR
  // Group J
  137: { ataque: 1.80, defensa: 0.68 }, // ARG
  138: { ataque: 0.90, defensa: 1.05 }, // ALG
  139: { ataque: 1.08, defensa: 0.95 }, // AUT
  140: { ataque: 0.72, defensa: 1.22 }, // JOR
  // Group K
  141: { ataque: 1.60, defensa: 0.76 }, // POR
  142: { ataque: 0.88, defensa: 1.08 }, // COD
  143: { ataque: 0.78, defensa: 1.18 }, // UZB
  144: { ataque: 1.18, defensa: 0.90 }, // COL
  // Group L
  145: { ataque: 1.52, defensa: 0.79 }, // ENG
  146: { ataque: 1.15, defensa: 0.90 }, // CRO
  147: { ataque: 0.88, defensa: 1.08 }, // GHA
  148: { ataque: 0.72, defensa: 1.22 }, // PAN
}

// Cap per-match goals to prevent outlier blowouts in qualifiers from
// dominating the average. Set to 7 — still penalizes extreme minnow results
// (14-0) while letting legitimate 5-0 or 6-0 performances count fully.
const MAX_GOLES_PARTIDO = 7

// Bayesian blending: treat RATINGS_BASE as a prior worth this many pseudo-matches.
// Teams with few data points stay close to the prior; teams with 20+ matches
// are mostly data-driven. This prevents Curacao's 8-0 vs Aruba from making
// them look stronger than Germany.
const PRIOR_PSEUDO_PARTIDOS = 10

function fuerzaEquipo(stats: StatsPartido["local"], equipoId: number) {
  const base = RATINGS_BASE[equipoId] ?? { ataque: 1, defensa: 1 }
  if (stats.length === 0) return base

  const n = stats.length
  const sumGF = stats.reduce((s, e) => s + Math.min(e.golesFavor, MAX_GOLES_PARTIDO), 0)
  const sumGC = stats.reduce((s, e) => s + Math.min(e.golesContra, MAX_GOLES_PARTIDO), 0)
  const obsAtaque = sumGF / n / MEDIA_LIGA
  const obsDefensa = sumGC / n / MEDIA_LIGA

  const wPrior = PRIOR_PSEUDO_PARTIDOS / (PRIOR_PSEUDO_PARTIDOS + n)
  const wObs   = n / (PRIOR_PSEUDO_PARTIDOS + n)

  return {
    ataque:  Math.max(base.ataque  * wPrior + obsAtaque  * wObs, 0.1),
    defensa: Math.max(base.defensa * wPrior + obsDefensa * wObs, 0.1),
  }
}

function mediaStats(stats: StatsPartido["local"], campo: "tarjetasAmarillas" | "corners"): number {
  if (stats.length === 0) return campo === "tarjetasAmarillas" ? 2 : 5
  return stats.reduce((s, e) => s + e[campo], 0) / stats.length
}

export function predecirPartido(partido: Partido, stats: StatsPartido): Prediccion {
  const fLocal = fuerzaEquipo(stats.local, partido.equipoLocal.id)
  const fVisitante = fuerzaEquipo(stats.visitante, partido.equipoVisitante.id)

  const lambdaLocal = fLocal.ataque * fVisitante.defensa * MEDIA_LIGA * FACTOR_LOCAL
  const lambdaVisitante = fVisitante.ataque * fLocal.defensa * MEDIA_LIGA

  const matrizRaw = bivariatePoisson(lambdaLocal, lambdaVisitante)
  const matriz = applyDixonColes(matrizRaw, lambdaLocal, lambdaVisitante)

  const r1x2 = resultado1x2(matriz)
  // Raw Poisson for score, conditioned on predicted winner zone
  const marcador = marcadorMasProbable(matrizRaw, r1x2)
  const mediaTarjetas =
    mediaStats(stats.local, "tarjetasAmarillas") + mediaStats(stats.visitante, "tarjetasAmarillas")
  const mediaCorners =
    mediaStats(stats.local, "corners") + mediaStats(stats.visitante, "corners")

  const mercados: PrediccionMercado[] = [
    { mercado: "resultado_1x2", probabilidades: r1x2 },
    {
      mercado: "marcador_probable",
      probabilidades: {
        [`${marcador.local}-${marcador.visitante}`]: marcador.probabilidad,
      },
    },
    { mercado: "total_goles", linea: 2.5, probabilidades: totalGoles(matriz, 2.5) },
    { mercado: "total_goles", linea: 1.5, probabilidades: totalGoles(matriz, 1.5) },
    { mercado: "total_goles", linea: 3.5, probabilidades: totalGoles(matriz, 3.5) },
    { mercado: "ambos_anotan", probabilidades: ambosMArcan(matriz) },
    { mercado: "goles_local", linea: 0.5, probabilidades: golesEquipo(matriz, "local", 0.5) },
    { mercado: "goles_visitante", linea: 0.5, probabilidades: golesEquipo(matriz, "visitante", 0.5) },
    ...Object.entries(marketLinea(mediaTarjetas, [3.5, 4.5])).map(([l, p]) => ({
      mercado: "tarjetas",
      linea: parseFloat(l),
      probabilidades: p,
    })),
    ...Object.entries(marketLinea(mediaCorners, [9.5, 10.5])).map(([l, p]) => ({
      mercado: "corners",
      linea: parseFloat(l),
      probabilidades: p,
    })),
    { mercado: "matriz_display", probabilidades: Object.fromEntries(
      matrizDisplay(matriz).flatMap((row, i) =>
        row.map((p, j) => [`${i}-${j}`, p])
      )
    )},
  ]

  const goleadoresLocal = rankearGoleadores(stats.jugadoresLocal, lambdaLocal)
  const goleadoresVisitante = rankearGoleadores(stats.jugadoresVisitante, lambdaVisitante)

  return {
    partidoId: partido.id,
    timestamp: new Date().toISOString(),
    mercados,
    goleadoresProbables: [...goleadoresLocal, ...goleadoresVisitante],
  }
}
