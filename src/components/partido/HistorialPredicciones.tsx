"use client"

import { useState } from "react"
import { SparklineHistorial } from "@/components/charts/SparklineHistorial"
import type { Prediccion } from "@/types"

type Props = { historial: Prediccion[] }

export function HistorialPredicciones({ historial }: Props) {
  const [abierto, setAbierto] = useState(false)

  if (historial.length < 2) {
    const ts = historial[0]?.timestamp
    return (
      <p className="text-[10px] text-[var(--muted)]">
        Predicción calculada:{" "}
        {ts ? new Date(ts).toLocaleString("es-ES") : "N/D"}
      </p>
    )
  }

  const puntosProbLocal = historial
    .slice()
    .reverse()
    .map((p) => {
      const m = p.mercados.find((m) => m.mercado === "resultado_1x2")
      return { timestamp: p.timestamp, valor: m?.probabilidades.local ?? 0 }
    })

  const ultimo = historial[0]
  const ts = new Date(ultimo.timestamp).toLocaleString("es-ES")

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-[var(--muted)]">Predicción calculada: {ts}</p>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="text-[10px] text-[var(--accent)] tracking-wider uppercase hover:underline"
        >
          {abierto ? "ocultar historial" : `ver historial (${historial.length})`}
        </button>
      </div>

      {abierto && (
        <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-3">
          <SparklineHistorial puntos={puntosProbLocal} label="P(victoria local)" />
          <div className="flex flex-col gap-1">
            {historial.map((p) => {
              const m1x2 = p.mercados.find((m) => m.mercado === "resultado_1x2")
              return (
                <div key={p.timestamp} className="flex gap-4 text-[10px] text-[var(--muted)]">
                  <span>{new Date(p.timestamp).toLocaleString("es-ES", { timeZone: "UTC" })}</span>
                  {m1x2 && (
                    <>
                      <span>L {(m1x2.probabilidades.local * 100).toFixed(0)}%</span>
                      <span>E {(m1x2.probabilidades.empate * 100).toFixed(0)}%</span>
                      <span>V {(m1x2.probabilidades.visitante * 100).toFixed(0)}%</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
