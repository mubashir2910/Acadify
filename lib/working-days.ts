const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+5:30

/** Returns current time shifted to IST. Use .getUTC* methods to read IST date parts. */
export function getNowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

/** Returns today's date string (YYYY-MM-DD) in IST. */
export function getTodayISTString(): string {
  return getNowIST().toISOString().split("T")[0]
}

/**
 * Count working days between two dates, inclusive.
 * A day counts as working if:
 *  - It's a weekday (Mon–Fri) AND not in the holidays list
 *  - OR it's a weekend (Sat/Sun) AND in the workingWeekends list
 */
export function countWorkingDays(
  from: Date,
  to: Date,
  holidays?: Date[],
  workingWeekends?: Date[]
): number {
  let count = 0
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  // Build Sets of date strings for O(1) lookup
  const holidaySet = new Set(
    holidays?.map((d) => {
      const h = new Date(d)
      h.setHours(0, 0, 0, 0)
      return h.toISOString()
    }) ?? []
  )
  const workingWeekendSet = new Set(
    workingWeekends?.map((d) => {
      const h = new Date(d)
      h.setHours(0, 0, 0, 0)
      return h.toISOString()
    }) ?? []
  )

  while (current <= end) {
    const day = current.getDay()
    const iso = current.toISOString()
    const weekend = day === 0 || day === 6

    if (weekend) {
      // Weekend: only count if explicitly marked as working day
      if (workingWeekendSet.has(iso)) count++
    } else {
      // Weekday: count unless marked as holiday
      if (!holidaySet.has(iso)) count++
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday).
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Format a date as YYYY-MM-DD string.
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Get the Monday of the current week in IST, returned as UTC midnight of that date.
 * Consistent with how attendance dates are stored (UTC midnight of the IST date).
 */
export function getWeekStart(): Date {
  const ist = getNowIST()
  const day = ist.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  ist.setUTCDate(ist.getUTCDate() - diff)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()))
}

/**
 * Get the most recent working day (Mon–Fri) in IST.
 * If today (IST) is Mon–Fri, returns today. If Sat/Sun, walks back to Friday.
 */
export function getMostRecentWorkingDay(): Date {
  const ist = getNowIST()
  ist.setUTCHours(0, 0, 0, 0)
  while (isWeekend(ist)) {
    ist.setUTCDate(ist.getUTCDate() - 1)
  }
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()))
}
