import type { Partido, Prediccion } from "@/types"
import { Bandera } from "@/components/ui/Bandera"

type Props = { partido: Partido; prediccion: Prediccion | null }

function getMarcador(prediccion: Prediccion | null) {
  if (!prediccion) return null
  const m = prediccion.mercados.find((m) => m.mercado === "marcador_probable")
  if (!m) return null
  const key = Object.keys(m.probabilidades)[0]
  const [local, visitante] = key.split("-").map(Number)
  return { local, visitante, pct: m.probabilidades[key] }
}

export function MarcadorPredicho({ partido, prediccion }: Props) {
  const marcador = getMarcador(prediccion)
  const fecha = new Date(partido.fechaUtc).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })

  return (
    <div className="flex flex-col items-center gap-6 py-10 border-b border-[var(--border)]">
      {/* Badge fase */}
      <div className="flex items-center gap-2">
        <div className="h-[2px] w-6 bg-[var(--accent)]" />
        <span className="text-[10px] tracking-[0.45em] uppercase text-[var(--accent)] font-bold">
          {partido.fase === "grupo" ? `Grupo ${partido.grupo}` : partido.fase.toUpperCase()}
        </span>
        <div className="h-[2px] w-6 bg-[var(--accent)]" />
      </div>

      {/* Equipos + marcador */}
      <div className="flex items-center gap-8 w-full max-w-2xl">
        {/* Equipo local */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <Bandera codigo={partido.equipoLocal.codigo} size={64} />
          <span className="text-2xl font-bold tracking-[0.15em] text-[var(--foreground)] uppercase">
            {partido.equipoLocal.codigo}
          </span>
          <span className="text-[11px] text-[var(--muted)] text-center leading-tight">
            {partido.equipoLocal.nombre}
          </span>
        </div>

        {/* Marcador central */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          {marcador ? (
            <div className="flex items-center gap-3">
              <span className="text-[100px] font-bold tabular-nums text-[var(--foreground)] leading-none tracking-tighter">
                {marcador.local}
              </span>
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                <span className="text-4xl font-bold text-[var(--accent)] leading-none">-</span>
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              </div>
              <span className="text-[100px] font-bold tabular-nums text-[var(--foreground)] leading-none tracking-tighter">
                {marcador.visitante}
              </span>
            </div>
          ) : (
            <span className="text-6xl font-bold text-[var(--border)] tracking-widest">VS</span>
          )}
        </div>

        {/* Equipo visitante */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <Bandera codigo={partido.equipoVisitante.codigo} size={64} />
          <span className="text-2xl font-bold tracking-[0.15em] text-[var(--foreground)] uppercase">
            {partido.equipoVisitante.codigo}
          </span>
          <span className="text-[11px] text-[var(--muted)] text-center leading-tight">
            {partido.equipoVisitante.nombre}
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-col items-center gap-1.5">
        {marcador && (
          <div className="flex items-center gap-2 bg-[var(--accent-dim)] border border-[var(--accent)] px-3 py-1">
            <span className="text-[10px] text-[var(--accent)] tracking-[0.3em] uppercase font-bold">
              Resultado más probable · {(marcador.pct * 100).toFixed(0)}%
            </span>
          </div>
        )}
        <span className="text-[11px] text-[var(--muted)]">
          {fecha} UTC · {partido.estadio}
        </span>
      </div>
    </div>
  )
}
