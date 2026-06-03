/**
 * Generates a 12-month rolling window starting from a given date.
 * E.g. start = 20-Apr-2026 → Apr 2026 … Mar 2027.
 * Used by fee-structure forms (per-head month picker) and exports (month filter).
 */
export type MonthOption = {
  year: number
  month: number // 1-12
  label: string // e.g. "Jun 2026"
  key: string // e.g. "2026-06" (for stable React keys)
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export function monthOptionsFrom(start: Date | string, count = 12): MonthOption[] {
  const d = typeof start === "string" ? new Date(start.length === 10 ? `${start}T00:00:00.000Z` : start) : new Date(start)
  if (Number.isNaN(d.getTime())) return []
  const result: MonthOption[] = []
  let year = d.getUTCFullYear()
  let month = d.getUTCMonth() + 1 // 1-12
  for (let i = 0; i < count; i++) {
    result.push({
      year,
      month,
      label: `${MONTH_NAMES_SHORT[month - 1]} ${year}`,
      key: `${year}-${String(month).padStart(2, "0")}`,
    })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return result
}

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_SHORT[(month - 1) % 12]} ${year}`
}
