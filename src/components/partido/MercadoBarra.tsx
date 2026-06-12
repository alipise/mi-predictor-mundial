import { BarraHorizontal } from "@/components/charts/BarraHorizontal"
import type { PrediccionMercado } from "@/types"

type Props = {
  mercado: PrediccionMercado
  etiquetas?: Record<string, string>
  titulo: string
  ordenForzado?: string[]
}

export function MercadoBarra({ mercado, etiquetas, titulo, ordenForzado }: Props) {
  const entries = ordenForzado
    ? ordenForzado.map((k) => [k, mercado.probabilidades[k] ?? 0] as [string, number])
    : Object.entries(mercado.probabilidades).sort((a, b) => b[1] - a[1])

  const max = Math.max(...entries.map(([, v]) => v))

  const segmentos = entries.map(([key, valor]) => ({
    label: etiquetas?.[key] ?? key,
    valor,
    acento: valor === max,
  }))

  return (
    <div
      className="flex flex-col gap-3 bg-[var(--surface)] border border-[var(--border)] p-4"
      style={{ borderLeft: "3px solid var(--accent)" }}
    >
      <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--muted)] font-bold">{titulo}</span>
      <BarraHorizontal segmentos={segmentos} />
    </div>
  )
}
