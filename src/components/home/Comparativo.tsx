import { getPartidosConResultado } from "@/lib/db/queries"
import type { Partido, Prediccion } from "@/types"

type PartidoConPred = Partido & { prediccion: Prediccion | null }

function outcome(gl: number, gv: number): "local" | "empate" | "visitante" {
  if (gl > gv) return "local"
  if (gl === gv) return "empate"
  return "visitante"
}

function predOutcome(pred: Prediccion): "local" | "empate" | "visitante" | null {
  const r1x2 = pred.mercados.find((m) => m.mercado === "resultado_1x2")
  if (!r1x2) return null
  const { local, empate, visitante } = r1x2.probabilidades as {
    local: number; empate: number; visitante: number
  }
  const max = Math.max(local, empate, visitante)
  if (local === max) return "local"
  if (empate === max) return "empate"
  return "visitante"
}

function Prob({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
  return (
    <span
      className="tabular-nums text-xs font-bold"
      style={{ color: highlight ? "var(--accent)" : "var(--muted)" }}
    >
      {label} <span className="font-normal">{Math.round(value * 100)}%</span>
    </span>
  )
}

function FilaPartido({ p }: { p: PartidoConPred }) {
  const gl = p.golesLocal!
  const gv = p.golesVisitante!
  const real = outcome(gl, gv)
  const pred = p.prediccion ? predOutcome(p.prediccion) : null
  const acierto = pred !== null && pred === real
  const r1x2 = p.prediccion?.mercados.find((m) => m.mercado === "resultado_1x2")
  const marcador = p.prediccion?.mercados.find((m) => m.mercado === "marcador_probable")
  const marcadorPred = marcador ? Object.keys(marcador.probabilidades)[0] : null
  const probLocal = r1x2 ? (r1x2.probabilidades.local as number) : null
  const probEmpate = r1x2 ? (r1x2.probabilidades.empate as number) : null
  const probVisita = r1x2 ? (r1x2.probabilidades.visitante as number) : null

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0">
      {/* Equipos y resultado */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="text-sm font-bold tabular-nums shrink-0"
          style={{ color: real === "local" ? "var(--foreground)" : "var(--muted)" }}
        >
          {p.equipoLocal.codigo}
        </span>
        <span
          className="text-base font-black tabular-nums tracking-tight shrink-0"
          style={{ color: real === "local" ? "var(--accent)" : real === "visitante" ? "var(--muted)" : "var(--foreground)" }}
        >
          {gl}
        </span>
        <span className="text-[10px] text-[var(--border)] shrink-0">:</span>
        <span
          className="text-base font-black tabular-nums tracking-tight shrink-0"
          style={{ color: real === "visitante" ? "var(--accent)" : real === "local" ? "var(--muted)" : "var(--foreground)" }}
        >
          {gv}
        </span>
        <span
          className="text-sm font-bold tabular-nums shrink-0"
          style={{ color: real === "visitante" ? "var(--foreground)" : "var(--muted)" }}
        >
          {p.equipoVisitante.codigo}
        </span>
        {p.grupo && (
          <span className="hidden sm:inline text-[10px] text-[var(--border)] ml-1">Gr.{p.grupo}</span>
        )}
      </div>

      {/* Probabilidades predichas */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {probLocal !== null ? (
          <>
            <Prob label="L" value={probLocal} highlight={pred === "local"} />
            <span className="text-[var(--border)] text-[10px]">·</span>
            <Prob label="E" value={probEmpate!} highlight={pred === "empate"} />
            <span className="text-[var(--border)] text-[10px]">·</span>
            <Prob label="V" value={probVisita!} highlight={pred === "visitante"} />
          </>
        ) : (
          <span className="text-[10px] text-[var(--border)]">sin pred.</span>
        )}
      </div>

      {/* Marcador predicho */}
      <div className="shrink-0 text-xs tabular-nums font-bold hidden sm:block" style={{ color: acierto ? "var(--accent)" : "var(--foreground)" }}>
        {marcadorPred ? marcadorPred : "—"}
      </div>

      {/* Acierto — bullet point de color */}
      <div className="shrink-0 flex items-center justify-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            background:
              pred === null
                ? "var(--border)"
                : acierto
                  ? "#10b981"
                  : "#ef4444",
          }}
        />
        <span className="text-xs font-bold" style={{ color: acierto ? "#10b981" : pred === null ? "var(--border)" : "#ef4444" }}>
          {pred === null ? "—" : acierto ? "✓" : "✗"}
        </span>
      </div>
    </div>
  )
}

export async function Comparativo() {
  const partidos = await getPartidosConResultado()

  if (partidos.length === 0) {
    return (
      <div className="border border-[var(--border)] px-4 py-8 text-center">
        <p className="text-xs text-[var(--muted)]">Sin resultados todavía.</p>
        <p className="text-[10px] text-[var(--border)] mt-1">
          Ejecuta <code className="text-[var(--accent)]">pnpm import:resultados</code> cuando haya partidos jugados.
        </p>
      </div>
    )
  }

  const conPred = partidos.filter((p) => p.prediccion !== null)
  const aciertos = conPred.filter((p) => {
    const real = outcome(p.golesLocal!, p.golesVisitante!)
    const pred = predOutcome(p.prediccion!)
    return pred === real
  })
  const pct = conPred.length > 0 ? Math.round((aciertos.length / conPred.length) * 100) : 0

  return (
    <div className="flex flex-col gap-0">
      {/* Header stats */}
      <div className="flex items-baseline justify-between px-4 py-3 border border-[var(--border)] border-b-0">
        <div className="flex items-baseline gap-3">
          <span
            className="text-3xl font-black tabular-nums tracking-tight"
            style={{ color: "var(--accent)" }}
          >
            {aciertos.length}/{conPred.length}
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
            aciertos
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tabular-nums" style={{ color: pct >= 60 ? "var(--accent)" : "var(--foreground)" }}>
            {pct}%
          </span>
          <span className="text-[10px] text-[var(--muted)]">precisión</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] border-b-0">
        <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--border)]">Partido</span>
        <span className="hidden sm:block text-[9px] tracking-[0.2em] uppercase text-[var(--border)]">Probabilidades</span>
        <span className="hidden sm:block text-[9px] tracking-[0.2em] uppercase text-[var(--border)]">Marcador predicho</span>
        <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--border)]">OK</span>
      </div>

      {/* Rows */}
      <div className="border border-[var(--border)]">
        {partidos.map((p) => (
          <FilaPartido key={p.id} p={p} />
        ))}
      </div>
    </div>
  )
}
