/**
 * Single source of truth for contest effective status.
 *
 * Effective status is ALWAYS derived from server time + timing fields.
 * Never read the DB `status` column alone to determine what to display —
 * a quiz may have DB status = "ACTIVE" but be UPCOMING or ENDED by time.
 *
 * Rules:
 *   ENDED   → DB status is CLOSED, OR current time ≥ end_time
 *   LIVE    → current time is within [start_time, end_time)
 *   UPCOMING→ current time < start_time
 */
export type EffectiveStatus = "UPCOMING" | "LIVE" | "ENDED"

export function computeEffectiveStatus(
  dbStatus: string,
  startTime: Date | string,
  endTime: Date | string,
  now: Date = new Date()
): EffectiveStatus {
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (dbStatus === "CLOSED" || now >= end) return "ENDED"
  if (now >= start) return "LIVE"
  return "UPCOMING"
}

/** Client-side helper: re-derive status from ISO strings at any point in time. */
export function deriveEffectiveStatus(
  dbStatus: string,
  startTime: string,
  endTime: string
): EffectiveStatus {
  return computeEffectiveStatus(dbStatus, startTime, endTime, new Date())
}
