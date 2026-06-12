import { NextResponse } from "next/server"
import { runCron } from "@/lib/cron/run"

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET ?? ""

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await runCron()
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    console.error("[/api/cron]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
