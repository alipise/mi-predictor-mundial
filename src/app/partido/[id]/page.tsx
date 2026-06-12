import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPartidoById, getPrediccionLatest, getHistorialPredicciones, getEstadisticasEquipo } from "@/lib/db/queries"
import { MarcadorPredicho } from "@/components/partido/MarcadorPredicho"
import { Resultado1x2 } from "@/components/partido/Resultado1x2"
import { MercadosPanelEstadistico } from "@/components/partido/MercadosPanelEstadistico"
import { DistribucionGoles } from "@/components/partido/DistribucionGoles"
import { GoleadoresRanking } from "@/components/partido/GoleadoresRanking"
import { HistorialPredicciones } from "@/components/partido/HistorialPredicciones"
import Link from "next/link"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const partido = await getPartidoById(parseInt(id))
  if (!partido) return {}
  const title = `${partido.equipoLocal.codigo} vs ${partido.equipoVisitante.codigo} — Predictor IA Mundial 2026`
  return { title, openGraph: { title } }
}

export default async function PartidoPage({ params }: Props) {
  const { id } = await params
  const partido = await getPartidoById(parseInt(id))
  if (!partido) notFound()

  const [prediccion, historial, statsLocal, statsVisitante] = await Promise.all([
    getPrediccionLatest(partido.id),
    getHistorialPredicciones(partido.id),
    getEstadisticasEquipo(partido.equipoLocal.id, 10),
    getEstadisticasEquipo(partido.equipoVisitante.id, 10),
  ])

  const sinHistorico = statsLocal.length === 0 && statsVisitante.length === 0
  const m1x2 = prediccion?.mercados.find((m) => m.mercado === "resultado_1x2")

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-0">
      <div className="pb-6">
        <Link
          href="/"
          className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] tracking-[0.3em] uppercase font-bold transition-colors"
        >
          ← Volver
        </Link>
      </div>

      <MarcadorPredicho partido={partido} prediccion={prediccion} />

      {!prediccion && (
        <p className="text-xs text-[var(--muted)] text-center py-8">
          Sin predicción. Ejecuta <code className="text-[var(--accent)]">pnpm cron:run</code>
        </p>
      )}

      {prediccion && (
        <div className="flex flex-col gap-10 pt-10">

          {m1x2 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--muted)] font-bold">Resultado</span>
                {sinHistorico && (
                  <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] px-2 py-0.5">
                    Sin historial · probabilidades base
                  </span>
                )}
              </div>
              <Resultado1x2
                localCodigo={partido.equipoLocal.codigo}
                visitanteCodigo={partido.equipoVisitante.codigo}
                probabilidades={{
                  local: m1x2.probabilidades.local,
                  empate: m1x2.probabilidades.empate,
                  visitante: m1x2.probabilidades.visitante,
                }}
              />
            </section>
          )}

          <DistribucionGoles
            prediccion={prediccion}
            codigoLocal={partido.equipoLocal.codigo}
            codigoVisitante={partido.equipoVisitante.codigo}
          />

          <div
            className="bg-[var(--surface)] border border-[var(--border)] p-6"
            style={{ borderLeft: "3px solid var(--accent)" }}
          >
            <MercadosPanelEstadistico
              prediccion={prediccion}
              codigoLocal={partido.equipoLocal.codigo}
              codigoVisitante={partido.equipoVisitante.codigo}
            />
          </div>

          <GoleadoresRanking
            prediccion={prediccion}
            codigoLocal={partido.equipoLocal.codigo}
            codigoVisitante={partido.equipoVisitante.codigo}
          />

          <div className="border-t border-[var(--border)] pt-4">
            <HistorialPredicciones historial={historial} />
          </div>
        </div>
      )}
    </div>
  )
}
