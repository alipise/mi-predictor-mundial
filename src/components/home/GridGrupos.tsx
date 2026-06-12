import Link from "next/link"
import { getGruposConEquipos } from "@/lib/db/queries"
import { Bandera } from "@/components/ui/Bandera"

export async function GridGrupos() {
  const grupos = await getGruposConEquipos()
  const letras = Object.keys(grupos).sort()

  if (letras.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-4">
      {letras.map((letra) => (
        <Link
          key={letra}
          href={`/grupo/${letra}`}
          className="bg-[var(--surface)] p-4 flex flex-col gap-3 hover:bg-[#1a0e00] transition-colors group border-t-2 border-t-transparent hover:border-t-[var(--accent)]"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-[0.25em] font-bold">Grupo</span>
            <span className="text-3xl font-bold text-[var(--accent)]">{letra}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {grupos[letra].map((eq) => (
              <div key={eq.id} className="flex items-center gap-2">
                <Bandera codigo={eq.codigo} size={18} />
                <span className="text-xs text-[var(--foreground)] truncate font-bold tracking-wider uppercase">
                  {eq.codigo}
                </span>
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  )
}
