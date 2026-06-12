"use client"

type Punto = { timestamp: string; valor: number }

type Props = {
  puntos: Punto[]
  label: string
  width?: number
  height?: number
}

export function SparklineHistorial({ puntos, label, width = 120, height = 32 }: Props) {
  if (puntos.length < 2) return null

  const min = Math.min(...puntos.map((p) => p.valor))
  const max = Math.max(...puntos.map((p) => p.valor))
  const range = max - min || 0.01

  const toX = (i: number) => (i / (puntos.length - 1)) * width
  const toY = (v: number) => height - ((v - min) / range) * height

  const path = puntos
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.valor).toFixed(1)}`)
    .join(" ")

  const last = puntos[puntos.length - 1]

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="overflow-visible">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <circle
          cx={toX(puntos.length - 1)}
          cy={toY(last.valor)}
          r={2}
          fill="var(--accent)"
        />
      </svg>
      <span className="text-[10px] text-[var(--muted)]">{label}</span>
    </div>
  )
}
