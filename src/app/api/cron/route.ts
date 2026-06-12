import { NextResponse } from "next/server"
import { runCron } from "@/lib/cron/run"

async function handleCron(req: Request) {
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

// Vercel Cron sends GET requests
export async function GET(req: Request) { return handleCron(req) }
// Manual trigger via POST
export async function POST(req: Request) { return handleCron(req) }
