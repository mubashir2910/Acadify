import { randomBytes } from "crypto"

/**
 * Generates a student unique ID used as the login username.
 * Format: {schoolCode}{NNNN}
 * Example: schoolCode="SA", sequence=1  → "SA0001"
 *          schoolCode="SA", sequence=42 → "SA0042"
 * NNNN is always exactly 4 digits (zero-padded). Supports up to 9999 students per school.
 */
export function generateStudentUniqueId(
  schoolCode: string,
  sequence: number
): string {
  const paddedSequence = String(sequence).padStart(4, "0")
  return `${schoolCode}${paddedSequence}`
}

/**
 * Generates a cryptographically random 8-character alphanumeric password.
 * Excludes visually ambiguous characters: 0, O, I, l, 1
 */
export function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const bytes = randomBytes(8)
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("")
}
