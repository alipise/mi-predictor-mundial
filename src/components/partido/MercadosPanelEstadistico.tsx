"use client"

import type { Prediccion } from "@/types"

type Props = {
  prediccion: Prediccion
  codigoLocal: string
  codigoVisitante: string
}

// A horizontal bar with label, percentage, and contextual note
function FilaMercado({
  label,
  valor,
  total,
  acento,
  nota,
}: {
  label: string
  valor: number
  total: number
  acento: boolean
  nota?: string
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : Math.round(valor * 100)
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex flex-col min-w-0" style={{ width: "52%" }}>
        <span
          className="text-[11px] font-bold uppercase tracking-wider truncate"
          style={{ color: acento ? "var(--foreground)" : "var(--muted)" }}
        >
          {label}
        </span>
        {nota && (
          <span className="text-[10px] text-[var(--muted)] tracking-wide">{nota}</span>
        )}
      </div>
      <div className="flex-1 h-[2px] bg-[var(--border)] relative">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${pct}%`,
            background: acento ? "var(--accent)" : "#444",
          }}
        />
      </div>
      <span
        className="tabular-nums font-bold shrink-0"
        style={{
          color: acento ? "var(--accent)" : "var(--muted)",
          fontSize: acento ? "1.25rem" : "0.875rem",
          width: "3rem",
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

function SectionHeader({ titulo, valor, unidad }: { titulo: string; valor?: number; unidad?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2 mb-4">
      <span className="text-[10px] tracking-[0.35em] uppercase text-[var(--muted)] font-bold">
        {titulo}
      </span>
      {valor !== undefined && (
        <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--accent)" }}>
          {valor.toFixed(1)}{" "}
          <span className="text-[var(--muted)] font-normal">{unidad}</span>
        </span>
      )}
    </div>
  )
}

export function MercadosPanelEstadistico({ prediccion, codigoLocal, codigoVisitante }: Props) {
  const find = (mercado: string, linea?: number) =>
    prediccion.mercados.find(
      (m) => m.mercado === mercado && (linea === undefined || m.linea === linea)
    )

  const lambdas = find("lambdas")
  const medias = find("medias")
  const goles15 = find("total_goles", 1.5)
  const goles25 = find("total_goles", 2.5)
  const goles35 = find("total_goles", 3.5)
  const ambos = find("ambos_anotan")
  const golesL05 = find("goles_local", 0.5)
  const golesL15 = find("goles_local", 1.5)
  const golesV05 = find("goles_visitante", 0.5)
  const golesV15 = find("goles_visitante", 1.5)
  const tarjetas35 = find("tarjetas", 3.5)
  const tarjetas45 = find("tarjetas", 4.5)
  const corners95 = find("corners", 9.5)
  const corners105 = find("corners", 10.5)

  const lLocal = lambdas?.probabilidades.local ?? 0
  const lVisitante = lambdas?.probabilidades.visitante ?? 0
  const mediaTotal = lLocal + lVisitante
  const mediaTarjetas = medias?.probabilidades.tarjetas ?? 0
  const mediaCorners = medias?.probabilidades.corners ?? 0

  // Compute goleada probability from matrix_display
  const matrizD = find("matriz_display")
  let pGoleada4 = 0
  if (matrizD) {
    for (const [score, prob] of Object.entries(matrizD.probabilidades)) {
      const [gl, gv] = score.split("-").map(Number)
      if (Math.abs(gl - gv) >= 4) pGoleada4 += prob as number
    }
  }

  const barGroup = "flex flex-col gap-3"

  return (
    <div className="flex flex-col gap-8">
      <span className="text-[10px] tracking-[0.35em] uppercase text-[var(--muted)] font-bold">
        Análisis estadístico
      </span>

      {/* TOTAL DE GOLES */}
      {(goles15 || goles25 || goles35) && (
        <section className="flex flex-col">
          <SectionHeader
            titulo="Total de goles"
            valor={mediaTotal > 0 ? mediaTotal : undefined}
            unidad="goles esperados en el partido"
          />
          <div className={barGroup}>
            {/* Expected goals per team */}
            {lambdas && mediaTotal > 0 && (
              <div className="flex gap-4 mb-2 text-[11px] font-bold uppercase tracking-wider">
                <span style={{ color: "var(--accent)" }}>
                  {codigoLocal} &nbsp;
                  <span className="text-[var(--muted)] font-normal">espera</span>{" "}
                  <span className="tabular-nums">{lLocal.toFixed(1)}</span>
                </span>
                <span className="text-[var(--border)]">·</span>
                <span style={{ color: "var(--accent)" }}>
                  {codigoVisitante} &nbsp;
                  <span className="text-[var(--muted)] font-normal">espera</span>{" "}
                  <span className="tabular-nums">{lVisitante.toFixed(1)}</span>
                </span>
              </div>
            )}
            {goles15 && (
              <FilaMercado
                label="2 goles o más"
                nota="Over 1.5 — al menos un equipo marca doble"
                valor={goles15.probabilidades.over}
                total={1}
                acento={
                  goles15.probabilidades.over >
                  Math.max(goles25?.probabilidades.over ?? 0, goles35?.probabilidades.over ?? 0)
                }
              />
            )}
            {goles25 && (
              <FilaMercado
                label="3 goles o más"
                nota="Over 2.5 — partido con goles para los dos"
                valor={goles25.probabilidades.over}
                total={1}
                acento={false}
              />
            )}
            {goles35 && (
              <FilaMercado
                label="4 goles o más"
                nota="Over 3.5 — territorio de goleada"
                valor={goles35.probabilidades.over}
                total={1}
                acento={false}
              />
            )}
            {pGoleada4 > 0.1 && (
              <div
                className="mt-1 px-3 py-1.5 border flex items-center gap-2"
                style={{ borderColor: "var(--accent)", background: "var(--accent-dim)" }}
              >
                <span className="text-[10px] tracking-[0.25em] uppercase font-bold" style={{ color: "var(--accent)" }}>
                  Goleada posible ·{" "}
                  <span className="tabular-nums">{Math.round(pGoleada4 * 100)}%</span> de prob de diferencia 4+ goles
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* GOLES POR EQUIPO */}
      {(golesL05 || golesV05) && (
        <section className="flex flex-col">
          <SectionHeader titulo="Goles por equipo" />
          <div className="grid grid-cols-2 gap-6">
            {(golesL05 || golesL15) && (
              <div className={barGroup}>
                <span
                  className="text-[11px] font-bold tracking-widest uppercase mb-1"
                  style={{ color: "var(--accent)" }}
                >
                  {codigoLocal}
                </span>
                {golesL05 && (
                  <FilaMercado
                    label="Anota al menos 1"
                    valor={golesL05.probabilidades.over}
                    total={1}
                    acento={golesL05.probabilidades.over >= 0.55}
                  />
                )}
                {golesL15 && (
                  <FilaMercado
                    label="Anota 2 o más"
                    valor={golesL15.probabilidades.over}
                    total={1}
                    acento={false}
                  />
                )}
              </div>
            )}
            {(golesV05 || golesV15) && (
              <div className={barGroup}>
                <span
                  className="text-[11px] font-bold tracking-widest uppercase mb-1"
                  style={{ color: "var(--accent)" }}
                >
                  {codigoVisitante}
                </span>
                {golesV05 && (
                  <FilaMercado
                    label="Anota al menos 1"
                    valor={golesV05.probabilidades.over}
                    total={1}
                    acento={golesV05.probabilidades.over >= 0.55}
                  />
                )}
                {golesV15 && (
                  <FilaMercado
                    label="Anota 2 o más"
                    valor={golesV15.probabilidades.over}
                    total={1}
                    acento={false}
                  />
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* AMBOS ANOTAN */}
      {ambos && (
        <section className="flex flex-col">
          <SectionHeader titulo="Ambos equipos anotan" />
          <p className="text-[11px] text-[var(--muted)] mb-3 leading-relaxed">
            Probabilidad de que <strong style={{ color: "var(--foreground)" }}>los dos equipos</strong> marquen
            al menos un gol en el partido.
          </p>
          <div className={barGroup}>
            <FilaMercado
              label="Sí — los dos marcan"
              valor={ambos.probabilidades.si}
              total={1}
              acento={ambos.probabilidades.si >= ambos.probabilidades.no}
            />
            <FilaMercado
              label="No — al menos uno no anota"
              valor={ambos.probabilidades.no}
              total={1}
              acento={ambos.probabilidades.no > ambos.probabilidades.si}
            />
          </div>
        </section>
      )}

      {/* TARJETAS AMARILLAS */}
      {(tarjetas35 || tarjetas45) && (
        <section className="flex flex-col">
          <SectionHeader
            titulo="Tarjetas amarillas"
            valor={mediaTarjetas > 0 ? mediaTarjetas : undefined}
            unidad="tarjetas esperadas en el partido"
          />
          <p className="text-[11px] text-[var(--muted)] mb-3 leading-relaxed">
            Calculado a partir del historial de tarjetas de cada equipo en sus últimos partidos.
          </p>
          <div className={barGroup}>
            {tarjetas35 && (
              <FilaMercado
                label="4 tarjetas o más"
                nota="Over 3.5"
                valor={tarjetas35.probabilidades.over}
                total={1}
                acento={tarjetas35.probabilidades.over >= 0.5}
              />
            )}
            {tarjetas45 && (
              <FilaMercado
                label="5 tarjetas o más"
                nota="Over 4.5"
                valor={tarjetas45.probabilidades.over}
                total={1}
                acento={false}
              />
            )}
          </div>
        </section>
      )}

      {/* TIROS DE ESQUINA */}
      {(corners95 || corners105) && (
        <section className="flex flex-col">
          <SectionHeader
            titulo="Tiros de esquina"
            valor={mediaCorners > 0 ? mediaCorners : undefined}
            unidad="córneres esperados en el partido"
          />
          <p className="text-[11px] text-[var(--muted)] mb-3 leading-relaxed">
            Suma de los córneres promedio de ambos equipos en su historial reciente.
          </p>
          <div className={barGroup}>
            {corners95 && (
              <FilaMercado
                label="10 córneres o más"
                nota="Over 9.5"
                valor={corners95.probabilidades.over}
                total={1}
                acento={corners95.probabilidades.over >= 0.5}
              />
            )}
            {corners105 && (
              <FilaMercado
                label="11 córneres o más"
                nota="Over 10.5"
                valor={corners105.probabilidades.over}
                total={1}
                acento={false}
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}
