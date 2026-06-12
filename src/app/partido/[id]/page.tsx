import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPartidoById, getPrediccionLatest, getHistorialPredicciones, getEstadisticasEquipo } from "@/lib/db/queries"
import { MarcadorPredicho } from "@/components/partido/MarcadorPredicho"
import { Resultado1x2 } from "@/components/partido/Resultado1x2"
import { MercadoBarra } from "@/components/partido/MercadoBarra"
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
  const mGoles25 = prediccion?.mercados.find((m) => m.mercado === "total_goles" && m.linea === 2.5)
  const mGoles15 = prediccion?.mercados.find((m) => m.mercado === "total_goles" && m.linea === 1.5)
  const mAmbos = prediccion?.mercados.find((m) => m.mercado === "ambos_anotan")
  const mTarjetas35 = prediccion?.mercados.find((m) => m.mercado === "tarjetas" && m.linea === 3.5)
  const mTarjetas45 = prediccion?.mercados.find((m) => m.mercado === "tarjetas" && m.linea === 4.5)
  const mCorners95 = prediccion?.mercados.find((m) => m.mercado === "corners" && m.linea === 9.5)
  const mCorners105 = prediccion?.mercados.find((m) => m.mercado === "corners" && m.linea === 10.5)

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mGoles25 && (
              <MercadoBarra mercado={mGoles25} titulo="Total goles · O/U 2.5" etiquetas={{ over: "Over 2.5", under: "Under 2.5" }} ordenForzado={["over", "under"]} />
            )}
            {mGoles15 && (
              <MercadoBarra mercado={mGoles15} titulo="Total goles · O/U 1.5" etiquetas={{ over: "Over 1.5", under: "Under 1.5" }} ordenForzado={["over", "under"]} />
            )}
            {mAmbos && (
              <MercadoBarra mercado={mAmbos} titulo="Ambos anotan" etiquetas={{ si: "Sí", no: "No" }} ordenForzado={["si", "no"]} />
            )}
            {mTarjetas35 && (
              <MercadoBarra mercado={mTarjetas35} titulo="Tarjetas · O/U 3.5" etiquetas={{ over: "Over 3.5", under: "Under 3.5" }} ordenForzado={["over", "under"]} />
            )}
            {mTarjetas45 && (
              <MercadoBarra mercado={mTarjetas45} titulo="Tarjetas · O/U 4.5" etiquetas={{ over: "Over 4.5", under: "Under 4.5" }} ordenForzado={["over", "under"]} />
            )}
            {mCorners95 && (
              <MercadoBarra mercado={mCorners95} titulo="Corners · O/U 9.5" etiquetas={{ over: "Over 9.5", under: "Under 9.5" }} ordenForzado={["over", "under"]} />
            )}
            {mCorners105 && (
              <MercadoBarra mercado={mCorners105} titulo="Corners · O/U 10.5" etiquetas={{ over: "Over 10.5", under: "Under 10.5" }} ordenForzado={["over", "under"]} />
            )}
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
