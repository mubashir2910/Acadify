import { NextResponse } from "next/server"

/**
 * Lightweight liveness probe for DigitalOcean App Platform health checks.
 * Public (see middleware allow-list) and does no DB work, so it stays fast and
 * never fails just because the database is briefly busy.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() })
}
