type Segmento = { label: string; valor: number; acento?: boolean }

type Props = {
  segmentos: Segmento[]
  className?: string
}

export function BarraHorizontal({ segmentos, className = "" }: Props) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0)

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {segmentos.map((seg) => {
        const pct = total > 0 ? (seg.valor / total) * 100 : 0
        return (
          <div key={seg.label} className="flex items-center gap-3">
            <span className="w-28 text-[11px] text-[var(--muted)] uppercase tracking-wider truncate font-bold">
              {seg.label}
            </span>
            <div className="flex-1 h-[3px] bg-[var(--border)] relative">
              <div
                className="absolute inset-y-0 left-0 transition-all"
                style={{
                  width: `${pct}%`,
                  background: seg.acento ? "var(--accent)" : "#555",
                }}
              />
            </div>
            <span
              className="w-14 text-right tabular-nums font-bold"
              style={{
                color: seg.acento ? "var(--accent)" : "var(--muted)",
                fontSize: seg.acento ? "1.35rem" : "0.875rem",
              }}
            >
              {Math.round(pct)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
