import { runCron } from "@/lib/cron/run"
import { guardarCalculo, getUltimoCalculo } from "@/lib/db/queries"

export async function POST(req: Request) {
  try {
    const startTime = Date.now()

    // Run the full cron: import results, sync stats, recalculate predictions
    await runCron()

    // Get the number of predictions that were just updated
    const ultimoCalculo = await getUltimoCalculo()
    const partidosActualizados = ultimoCalculo?.partidos ?? 0

    // Save the calculation timestamp
    await guardarCalculo(partidosActualizados)

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000)

    return Response.json({
      success: true,
      message: `Cálculo completado en ${elapsedSeconds}s`,
      partidosActualizados,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in recalcular:", error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
