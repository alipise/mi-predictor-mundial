import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { getPartidosGrupo, getGruposConEquipos, getPrediccionLatest } from "@/lib/db/queries"
import { Bandera } from "@/components/ui/Bandera"
import { PartidoCard } from "@/components/home/PartidoCard"

type Props = { params: Promise<{ grupo: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { grupo } = await params
  return { title: `Grupo ${grupo.toUpperCase()} — Predictor IA Mundial 2026 | MediaFox Sports` }
}

export default async function GrupoPage({ params }: Props) {
  const { grupo } = await params
  const letra = grupo.toUpperCase()

  const grupos = await getGruposConEquipos()
  const equipos = grupos[letra]
  if (!equipos) notFound()

  const partidos = await getPartidosGrupo(letra)
  const predicciones = await Promise.all(partidos.map((p) => getPrediccionLatest(p.id)))
  const prediccionMap = new Map(partidos.map((p, i) => [p.id, predicciones[i]]))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-10">
      <Link
        href="/"
        className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] tracking-[0.3em] uppercase font-bold transition-colors"
      >
        ← Volver
      </Link>

      <header className="flex flex-col gap-1 border-l-4 border-l-[var(--accent)] pl-4">
        <span className="text-[10px] tracking-[0.4em] uppercase text-[var(--muted)] font-bold">Grupo</span>
        <h1 className="text-8xl font-bold text-[var(--accent)] leading-none">{letra}</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-[10px] tracking-[0.35em] uppercase text-[var(--muted)] font-bold">Equipos</h2>
        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-4">
          {equipos.map((eq) => (
            <div key={eq.id} className="bg-[var(--surface)] p-4 flex flex-col gap-2 border-t-2 border-t-[var(--accent)]">
              <Bandera codigo={eq.codigo} size={40} />
              <span className="text-xl font-bold text-[var(--foreground)] tracking-widest uppercase">{eq.codigo}</span>
              <span className="text-xs text-[var(--muted)]">{eq.nombre}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[10px] tracking-[0.35em] uppercase text-[var(--muted)] font-bold">Partidos</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {partidos.map((partido) => (
            <PartidoCard
              key={partido.id}
              partido={partido}
              prediccion={prediccionMap.get(partido.id) ?? null}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
