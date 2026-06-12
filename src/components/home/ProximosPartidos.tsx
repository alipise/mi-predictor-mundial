import Link from "next/link"
import { getProximosPartidos, getPrediccionLatest } from "@/lib/db/queries"

export async function ProximosPartidos() {
  const partidos = await getProximosPartidos(8)

  if (partidos.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Sin partidos. Ejecuta{" "}
        <code className="text-[var(--accent)]">pnpm tsx scripts/seed.ts</code>
      </p>
    )
  }

  const predicciones = await Promise.all(partidos.map((p) => getPrediccionLatest(p.id)))
  const prediccionMap = new Map(partidos.map((p, i) => [p.id, predicciones[i]]))

  return (
    <div className="flex flex-col gap-px border border-[var(--border)]">
      {partidos.map((partido) => {
        const pred = prediccionMap.get(partido.id)
        const r1x2 = pred?.mercados.find((m) => m.mercado === "resultado_1x2")

        const pL = r1x2 ? Math.round(r1x2.probabilidades.local * 100) : null
        const pE = r1x2 ? Math.round(r1x2.probabilidades.empate * 100) : null
        const pV = r1x2 ? Math.round(r1x2.probabilidades.visitante * 100) : null
        const maxP = pL !== null ? Math.max(pL, pE!, pV!) : 0
        const unicoMax = pL !== null ? [pL, pE!, pV!].filter((v) => v === maxP).length === 1 : false
        const localLider = unicoMax && pL === maxP
        const visitanteLider = unicoMax && pV === maxP

        const fecha = new Date(partido.fechaUtc).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        })
        const hora = new Date(partido.fechaUtc).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        })

        return (
          <Link
            key={partido.id}
            href={`/partido/${partido.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface)] transition-colors group"
          >
            <div className="flex items-center gap-2 w-44 shrink-0">
              <span
                className="text-sm font-bold w-10 tabular-nums"
                style={{ color: localLider ? "var(--accent)" : "var(--foreground)" }}
              >
                {partido.equipoLocal.codigo}
              </span>
              <span className="text-[10px] text-[var(--border)]">vs</span>
              <span
                className="text-sm font-bold w-10 tabular-nums"
                style={{ color: visitanteLider ? "var(--accent)" : "var(--foreground)" }}
              >
                {partido.equipoVisitante.codigo}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-[var(--muted)]">
              <span>{partido.grupo ? `Gr. ${partido.grupo}` : partido.fase}</span>
              <span>{fecha} · {hora} UTC</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {pL !== null ? (
                <div className="flex items-center gap-1 text-xs tabular-nums font-bold">
                  <span style={{ color: localLider ? "var(--accent)" : "var(--muted)" }}>{pL}%</span>
                  <span className="text-[var(--border)] font-normal">·</span>
                  <span className="text-[var(--muted)] font-normal">{pE}%</span>
                  <span className="text-[var(--border)] font-normal">·</span>
                  <span style={{ color: visitanteLider ? "var(--accent)" : "var(--muted)" }}>{pV}%</span>
                </div>
              ) : (
                <span className="text-[10px] text-[var(--border)]">sin pred.</span>
              )}
              <span className="text-[10px] text-[var(--border)] group-hover:text-[var(--foreground)] transition-colors">→</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
