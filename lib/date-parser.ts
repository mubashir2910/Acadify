/**
 * Parses a date string in DD-MM-YYYY or YYYY-MM-DD format and returns a Date object.
 * Auto-detects format based on whether the first segment has 4 digits.
 * Accepts both `-` and `/` as separators.
 * Validates day/month boundaries (rejects 31-02-2000, etc.).
 */
export function parseDDMMYYYY(val: string): Date {
  const parts = val.trim().split(/[-/]/)
  if (parts.length !== 3) {
    throw new Error("Date must be in DD-MM-YYYY or YYYY-MM-DD format")
  }

  let dd: number, mm: number, yyyy: number

  if (parts[0].length === 4) {
    // YYYY-MM-DD format
    ;[yyyy, mm, dd] = parts.map(Number)
  } else {
    // DD-MM-YYYY format
    ;[dd, mm, yyyy] = parts.map(Number)
  }

  if (!dd || !mm || !yyyy || yyyy < 1900 || yyyy > new Date().getFullYear()) {
    throw new Error("Invalid date value")
  }

  const date = new Date(yyyy, mm - 1, dd)

  // Verify the date didn't roll over (e.g. Feb 31 → Mar 3)
  if (
    date.getFullYear() !== yyyy ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    throw new Error("Invalid date value")
  }

  return date
}
