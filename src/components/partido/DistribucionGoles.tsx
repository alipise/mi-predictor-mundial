import { HeatmapResultados } from "@/components/charts/HeatmapResultados"
import type { Prediccion } from "@/types"

type Props = {
  prediccion: Prediccion
  codigoLocal: string
  codigoVisitante: string
}

function extraerMatriz(prediccion: Prediccion): number[][] | null {
  const m = prediccion.mercados.find((m) => m.mercado === "matriz_display")
  if (!m) return null

  const matriz: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0))
  for (const [key, val] of Object.entries(m.probabilidades)) {
    const [i, j] = key.split("-").map(Number)
    if (i < 4 && j < 4) matriz[i][j] = val
  }
  return matriz
}

export function DistribucionGoles({ prediccion, codigoLocal, codigoVisitante }: Props) {
  const matriz = extraerMatriz(prediccion)
  if (!matriz) return null

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--muted)]">
        Distribución de resultados
      </span>
      <HeatmapResultados
        matriz={matriz}
        codigoLocal={codigoLocal}
        codigoVisitante={codigoVisitante}
      />
    </div>
  )
}
