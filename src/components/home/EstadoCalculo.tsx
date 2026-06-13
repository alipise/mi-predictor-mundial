"use client"

import { useState, useEffect } from "react"

type Estado = "idle" | "loading" | "success" | "error"

export function EstadoCalculo() {
  const [estado, setEstado] = useState<Estado>("idle")
  const [ultimoCalculo, setUltimoCalculo] = useState<{ timestamp: string; partidos: number } | null>(null)
  const [mensaje, setMensaje] = useState("")

  useEffect(() => {
    async function cargarUltimo() {
      try {
        const response = await fetch("/api/ultimo-calculo")
        const data = await response.json()
        if (data.success && data.data) {
          setUltimoCalculo(data.data)
        }
      } catch (error) {
        console.error("Error loading ultimo calculo:", error)
      }
    }
    cargarUltimo()
  }, [])

  const handleActualizar = async () => {
    setEstado("loading")
    setMensaje("")
    try {
      const response = await fetch("/api/recalcular", { method: "POST" })
      const data = await response.json()

      if (data.success) {
        setEstado("success")
        setMensaje(data.message)
        setUltimoCalculo({
          timestamp: data.timestamp,
          partidos: data.partidosActualizados,
        })
        setTimeout(() => {
          setEstado("idle")
          setMensaje("")
          window.location.reload()
        }, 2000)
      } else {
        setEstado("error")
        setMensaje(`Error: ${data.error}`)
      }
    } catch (error) {
      setEstado("error")
      setMensaje(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso)
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] font-bold">
          Último cálculo
        </span>
        {ultimoCalculo ? (
          <span className="text-xs text-[var(--foreground)]">
            {formatTime(ultimoCalculo.timestamp)} · {ultimoCalculo.partidos} partidos
          </span>
        ) : (
          <span className="text-xs text-[var(--muted)]">Sin cálculos aún</span>
        )}
      </div>

      <button
        onClick={handleActualizar}
        disabled={estado === "loading"}
        className="px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-bold rounded border transition-all"
        style={{
          borderColor:
            estado === "error"
              ? "#ef4444"
              : estado === "success"
                ? "#10b981"
                : "var(--accent)",
          color:
            estado === "error"
              ? "#ef4444"
              : estado === "success"
                ? "#10b981"
                : "var(--accent)",
          opacity: estado === "loading" ? 0.5 : 1,
          cursor: estado === "loading" ? "not-allowed" : "pointer",
        }}
      >
        {estado === "loading" ? "Actualizando..." : "Actualizar ahora"}
      </button>

      {mensaje && (
        <span
          className="text-[10px] ml-2"
          style={{
            color:
              estado === "error"
                ? "#ef4444"
                : estado === "success"
                  ? "#10b981"
                  : "var(--muted)",
          }}
        >
          {mensaje}
        </span>
      )}
    </div>
  )
}
