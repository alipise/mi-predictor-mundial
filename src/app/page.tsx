import Link from "next/link"
import { getPartidosByRango, getPrediccionLatest } from "@/lib/db/queries"
import { GridGrupos } from "@/components/home/GridGrupos"
import { PartidoCard } from "@/components/home/PartidoCard"
import { Comparativo } from "@/components/home/Comparativo"

const JORNADAS = [
  { n: 1, label: "Jornada 1", desde: "2026-06-11", hasta: "2026-06-19" },
  { n: 2, label: "Jornada 2", desde: "2026-06-19", hasta: "2026-06-26" },
  { n: 3, label: "Jornada 3", desde: "2026-06-26", hasta: "2026-07-03" },
]

type Props = { searchParams: Promise<{ j?: string; vista?: string }> }

export default async function HomePage({ searchParams }: Props) {
  const { j, vista } = await searchParams
  // Vercel test: cambio visible
  const jNum = j ? parseInt(j) : 1
  const jornada = JORNADAS.find((x) => x.n === jNum) ?? JORNADAS[0]
  const isGrupos = vista === "grupos"
  const isResultados = vista === "resultados"

  const partidos = isGrupos || isResultados ? [] : await getPartidosByRango(jornada.desde, jornada.hasta)
  const predicciones = await Promise.all(partidos.map((p) => getPrediccionLatest(p.id)))
  const prediccionMap = new Map(partidos.map((p, i) => [p.id, predicciones[i]]))

  const byDate = new Map<string, typeof partidos>()
  for (const p of partidos) {
    const dia = p.fechaUtc.slice(0, 10)
    if (!byDate.has(dia)) byDate.set(dia, [])
    byDate.get(dia)!.push(p)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">

      {/* Tab navigation */}
      <nav className="flex items-center gap-px border-b border-[var(--border)] overflow-x-auto">
        {JORNADAS.map((jor) => {
          const activo = !isGrupos && jNum === jor.n
          return (
            <Link
              key={jor.n}
              href={`/?j=${jor.n}`}
              className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap transition-colors border-b-2 -mb-px"
              style={{
                color: activo ? "var(--accent)" : "var(--muted)",
                borderBottomColor: activo ? "var(--accent)" : "transparent",
              }}
            >
              {jor.label}
            </Link>
          )
        })}
        <Link
          href="/?vista=grupos"
          className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap transition-colors border-b-2 -mb-px ml-auto"
          style={{
            color: isGrupos ? "var(--accent)" : "var(--muted)",
            borderBottomColor: isGrupos ? "var(--accent)" : "transparent",
          }}
        >
          Grupos
        </Link>
        <Link
          href="/?vista=resultados"
          className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap transition-colors border-b-2 -mb-px"
          style={{
            color: isResultados ? "var(--accent)" : "var(--muted)",
            borderBottomColor: isResultados ? "var(--accent)" : "transparent",
          }}
        >
          Aciertos
        </Link>
      </nav>

      {/* Vista grupos */}
      {isGrupos && <GridGrupos />}

      {/* Vista resultados vs predicciones */}
      {isResultados && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[10px] tracking-[0.3em] uppercase text-[var(--muted)] border-b border-[var(--border)] pb-2 font-bold">
            Predicciones vs Realidad
          </h2>
          <Comparativo />
        </section>
      )}

      {/* Vista jornada */}
      {!isGrupos && !isResultados && (
        <div className="flex flex-col gap-8">
          {[...byDate.entries()].map(([dia, plist]) => {
            const fecha = new Date(dia + "T00:00:00Z").toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })
            return (
              <section key={dia} className="flex flex-col gap-3">
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-[var(--muted)] border-b border-[var(--border)] pb-2 capitalize font-bold">
                  {fecha}
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {plist.map((partido) => (
                    <PartidoCard
                      key={partido.id}
                      partido={partido}
                      prediccion={prediccionMap.get(partido.id) ?? null}
                    />
                  ))}
                </div>
              </section>
            )
          })}
          {byDate.size === 0 && (
            <p className="text-xs text-[var(--muted)] py-8 text-center">
              Sin partidos para esta jornada.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
// VERCEL REDEPLOY FORCE
