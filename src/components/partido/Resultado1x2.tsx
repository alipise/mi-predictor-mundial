type Props = {
  localCodigo: string
  visitanteCodigo: string
  probabilidades: { local: number; empate: number; visitante: number }
}

export function Resultado1x2({ localCodigo, visitanteCodigo, probabilidades }: Props) {
  const { local, empate, visitante } = probabilidades
  const rLocal = Math.round(local * 100)
  const rEmpate = Math.round(empate * 100)
  const rVisitante = Math.round(visitante * 100)
  const max = Math.max(rLocal, rEmpate, rVisitante)
  const esUnicoMax = [rLocal, rEmpate, rVisitante].filter((v) => v === max).length === 1

  const columna = (
    rounded: number,
    label: string,
    sublabel: string,
    alineacion: "left" | "center" | "right"
  ) => {
    const esMayor = esUnicoMax && rounded === max
    const align = alineacion === "left" ? "items-start" : alineacion === "right" ? "items-end" : "items-center"
    return (
      <div className={`flex flex-col gap-1.5 flex-1 ${align}`}>
        <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--muted)] font-bold">
          {label}
        </span>
        <span
          className="text-7xl font-bold tabular-nums leading-none"
          style={{ color: esMayor ? "var(--accent)" : "var(--foreground)" }}
        >
          {rounded}
          <span className="text-3xl font-normal">%</span>
        </span>
        <span className="text-xs text-[var(--muted)] tracking-widest uppercase font-bold">
          {sublabel}
        </span>
      </div>
    )
  }

  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] p-6 flex items-end gap-4"
      style={{ borderLeft: "4px solid var(--accent)" }}
    >
      {columna(rLocal, "Local gana", localCodigo, "left")}
      <div className="w-px self-stretch bg-[var(--border)]" />
      {columna(rEmpate, "Empate", "X", "center")}
      <div className="w-px self-stretch bg-[var(--border)]" />
      {columna(rVisitante, "Visitante gana", visitanteCodigo, "right")}
    </div>
  )
}
