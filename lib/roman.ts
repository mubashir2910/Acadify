// Roman-numeral helpers for the Digital ID card.
// Class is stored as a free-text String (e.g. "3", "III", "Nursery", "LKG"), so the
// formatter only converts purely-numeric classes to Roman and passes anything else through.

const ROMAN_TABLE: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
]

/**
 * Converts a positive integer (1–3999) to its Roman-numeral representation.
 * Returns the original number as a string for values outside that range.
 */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n >= 4000) return String(n)

  let result = ""
  let remaining = n
  for (const [value, symbol] of ROMAN_TABLE) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }
  return result
}

/**
 * Formats a class + section for display on the ID card, e.g. "3" + "A" → "III-A".
 * Non-numeric classes (Nursery, LKG, already-Roman, etc.) are left untouched.
 */
export function formatClassSection(klass?: string | null, section?: string | null): string {
  if (!klass) return ""

  const trimmed = klass.trim()
  // Only convert when the class is a plain number; otherwise keep the original label.
  const label = /^\d+$/.test(trimmed) ? toRoman(parseInt(trimmed, 10)) : trimmed

  const sec = section?.trim()
  return sec ? `${label}-${sec}` : label
}
