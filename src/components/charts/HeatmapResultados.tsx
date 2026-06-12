type Props = {
  matriz: number[][] // 4x4, probabilidades 0-0 a 3-3
  codigoLocal: string
  codigoVisitante: string
}

function interpolateColor(p: number, maxP: number): string {
  const t = Math.min(p / maxP, 1)
  // dark surface (0) → accent orange #FF8C00 (1)
  return `rgba(255, 140, 0, ${0.08 + t * 0.88})`
}

export function HeatmapResultados({ matriz, codigoLocal, codigoVisitante }: Props) {
  const maxP = Math.max(...matriz.flat())

  return (
    <div className="flex flex-col gap-1">
      {/* Column headers = away goals */}
      <div className="flex gap-1 ml-10">
        {[0, 1, 2, 3].map((j) => (
          <div key={j} className="w-16 text-center text-[10px] text-[var(--muted)] tracking-wider uppercase">
            {codigoVisitante} {j}
          </div>
        ))}
      </div>

      {matriz.map((row, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-9 text-[10px] text-[var(--muted)] text-right pr-1 tracking-wider uppercase">
            {codigoLocal} {i}
          </div>
          {row.map((p, j) => {
            const isMax = p === maxP
            return (
              <div
                key={j}
                className="w-16 h-11 flex items-center justify-center text-xs tabular-nums font-bold border"
                style={{
                  background: interpolateColor(p, maxP),
                  borderColor: isMax ? "var(--accent)" : "var(--border)",
                  color: isMax ? "var(--accent)" : "var(--foreground)",
                }}
                title={`${i}-${j}: ${(p * 100).toFixed(1)}%`}
              >
                {(p * 100).toFixed(1)}%
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
