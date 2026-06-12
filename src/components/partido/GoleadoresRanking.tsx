import type { Prediccion } from "@/types"

type Props = { prediccion: Prediccion; codigoLocal: string; codigoVisitante: string }

export function GoleadoresRanking({ prediccion, codigoLocal, codigoVisitante }: Props) {
  const goleadores = prediccion.goleadoresProbables.slice(0, 8)
  if (goleadores.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[10px] tracking-[0.35em] uppercase text-[var(--muted)] font-bold">
        Goleadores probables
      </span>
      <div className="flex flex-col gap-3">
        {goleadores.map((g, i) => {
          const pct = Math.round(g.probabilidad * 100)
          const isPrimero = i === 0
          return (
            <div key={g.jugadorId} className="flex items-center gap-3">
              <span
                className="w-5 text-right tabular-nums font-bold text-[11px]"
                style={{ color: isPrimero ? "var(--accent)" : "var(--muted)" }}
              >
                {i + 1}
              </span>
              <span
                className="flex-1 text-sm truncate font-bold tracking-wide"
                style={{ color: isPrimero ? "var(--foreground)" : "var(--muted)" }}
              >
                {g.nombre}
              </span>
              {/* Barra */}
              <div className="w-28 h-[3px] bg-[var(--border)] relative">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${pct}%`,
                    background: isPrimero ? "var(--accent)" : "#555",
                  }}
                />
              </div>
              <span
                className="w-10 text-right tabular-nums font-bold"
                style={{
                  color: isPrimero ? "var(--accent)" : "var(--muted)",
                  fontSize: isPrimero ? "1rem" : "0.8rem",
                }}
              >
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
