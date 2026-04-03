/**
 * Masks an Aadhaar number, showing only the last 4 digits.
 * Example: "123456789012" → "XXXX-XXXX-9012"
 */
export function maskAadhaar(val: string | null): string {
  if (!val || val.length !== 12) return val ?? "—"
  return `XXXX-XXXX-${val.slice(8)}`
}
