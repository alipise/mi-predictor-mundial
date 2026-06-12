import Link from "next/link"
import { Bandera } from "@/components/ui/Bandera"
import type { Partido, Prediccion } from "@/types"

type Props = {
  partido: Partido
  prediccion: Prediccion | null
}

export function PartidoCard({ partido, prediccion }: Props) {
  const r1x2 = prediccion?.mercados.find((m) => m.mercado === "resultado_1x2")
  const marcadorM = prediccion?.mercados.find((m) => m.mercado === "marcador_probable")

  const pL = r1x2 ? Math.round(r1x2.probabilidades.local * 100) : null
  const pE = r1x2 ? Math.round(r1x2.probabilidades.empate * 100) : null
  const pV = r1x2 ? Math.round(r1x2.probabilidades.visitante * 100) : null
  const maxP = pL !== null ? Math.max(pL, pE!, pV!) : 0
  const unicoMax = pL !== null ? [pL, pE!, pV!].filter((v) => v === maxP).length === 1 : false
  const localLider = unicoMax && pL === maxP
  const visitanteLider = unicoMax && pV === maxP

  const marcadorKey = marcadorM ? Object.keys(marcadorM.probabilidades)[0] : null

  const hora = new Date(partido.fechaUtc).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })

  return (
    <Link
      href={`/partido/${partido.id}`}
      className="group flex flex-col bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-all duration-150 overflow-hidden"
    >
      {/* Orange top accent bar — siempre visible */}
      <div className="h-[2px] w-full bg-[var(--accent)] opacity-40 group-hover:opacity-100 transition-opacity" />

      {/* Cabecera: grupo + hora */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[9px] tracking-[0.35em] uppercase text-[var(--muted)] font-bold">
          {partido.grupo ? `Grupo ${partido.grupo}` : partido.fase}
        </span>
        <span className="text-[10px] tabular-nums text-[var(--muted)]">{hora} UTC</span>
      </div>

      {/* Cuerpo: equipos + probabilidades */}
      <div className="flex items-center px-4 pb-3 gap-3">

        {/* Equipo local */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Bandera codigo={partido.equipoLocal.codigo} size={36} />
          <span className="text-xs font-bold tracking-widest text-[var(--foreground)] truncate w-full text-center uppercase">
            {partido.equipoLocal.codigo}
          </span>
          {pL !== null && (
            <span
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: localLider ? "var(--accent)" : "var(--muted)" }}
            >
              {pL}<span className="text-sm font-normal">%</span>
            </span>
          )}
        </div>

        {/* Centro: empate + marcador predicho */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-16">
          {pE !== null && (
            <span className="text-[10px] text-[var(--muted)] tabular-nums">{pE}%</span>
          )}
          <span className="text-[10px] text-[var(--border)] tracking-widest font-bold">VS</span>
          {marcadorKey && (
            <span className="text-[11px] text-[var(--accent)] font-bold tabular-nums">
              {marcadorKey}
            </span>
          )}
        </div>

        {/* Equipo visitante */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Bandera codigo={partido.equipoVisitante.codigo} size={36} />
          <span className="text-xs font-bold tracking-widest text-[var(--foreground)] truncate w-full text-center uppercase">
            {partido.equipoVisitante.codigo}
          </span>
          {pV !== null && (
            <span
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: visitanteLider ? "var(--accent)" : "var(--muted)" }}
            >
              {pV}<span className="text-sm font-normal">%</span>
            </span>
          )}
        </div>
      </div>

      {/* Barra de probabilidad tricolor */}
      {pL !== null && (
        <div className="flex h-[3px] mx-0">
          <div
            className="h-full transition-all"
            style={{
              width: `${pL}%`,
              background: localLider ? "var(--accent)" : "var(--muted)",
              opacity: localLider ? 1 : 0.35,
            }}
          />
          <div className="h-full flex-1 bg-[var(--border)]" />
          <div
            className="h-full transition-all"
            style={{
              width: `${pV}%`,
              background: visitanteLider ? "var(--accent)" : "var(--muted)",
              opacity: visitanteLider ? 1 : 0.35,
            }}
          />
        </div>
      )}
    </Link>
  )
}
