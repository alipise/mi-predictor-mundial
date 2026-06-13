import { getUltimoCalculo } from "@/lib/db/queries"

export async function GET() {
  try {
    const ultimo = await getUltimoCalculo()
    return Response.json({
      success: true,
      data: ultimo,
    })
  } catch (error) {
    console.error("Error getting ultimo calculo:", error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
