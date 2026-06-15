// ─── User-facing error messages ──────────────────────────────────────────────
// API routes return short sentinel codes (e.g. "CLASS_MISMATCH") as the response
// `message` for known, mapped errors. Those are safe to expose (not stack traces)
// but read as raw ALL-CAPS codes in the UI. This maps the student-facing quiz/
// attempt sentinels to friendly sentences, with a sensible fallback.

const ATTEMPT_ERROR_MESSAGES: Record<string, string> = {
  CLASS_MISMATCH: "This contest isn't for your class.",
  QUIZ_NOT_STARTED: "This contest hasn't started yet.",
  QUIZ_ENDED: "This contest has ended.",
  QUIZ_NOT_ACTIVE: "This contest isn't available right now.",
  ALREADY_SUBMITTED: "You've already submitted this contest.",
  NOT_SUBMITTED: "You haven't submitted this contest yet.",
  TIME_EXPIRED: "Time's up — your latest answers were saved.",
  ATTEMPT_NOT_FOUND: "We couldn't find your attempt for this contest.",
  QUIZ_NOT_FOUND: "Contest not found.",
  STUDENT_NOT_FOUND: "Contest not found.",
}

/**
 * Maps a quiz/attempt sentinel code to a friendly sentence. Unknown or missing
 * codes fall back to a generic message so a raw code never reaches the user.
 */
export function friendlyAttemptError(code?: string | null): string {
  if (code && ATTEMPT_ERROR_MESSAGES[code]) return ATTEMPT_ERROR_MESSAGES[code]
  return "Something went wrong with the contest. Please try again."
}
