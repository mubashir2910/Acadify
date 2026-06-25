/**
 * Centralized cache key + tag builders.
 *
 * ALL cache keys in the app must be produced here — never hand-build a key in a
 * service. This guarantees every key is tenant-scoped (`schoolId`) and, for
 * personal data, identity-scoped (`userId`/`studentId`), which is what prevents
 * one school's (or one user's) cached data from being served to another.
 *
 * Convention:
 * - `cacheKeys.*`  → the exact key a value is stored under (often param-scoped).
 * - `cacheTags.*`  → the group(s) a key belongs to, busted on a related write.
 *
 * A read typically stores under `cacheKeys.x(...)` and tags it with one or more
 * `cacheTags.*`. A mutation calls `invalidateTags(cacheTags.x(...))`.
 */

/**
 * Stable serialization of query params into a key fragment. Sorts entries so
 * that `{a:1,b:2}` and `{b:2,a:1}` produce the same key. `undefined`/`null`
 * values are dropped so they don't fragment the key space.
 */
export function serializeParams(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => [k, String(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
  if (entries.length === 0) return "_"
  return entries.map(([k, v]) => `${k}=${v}`).join("&")
}

// ---------------------------------------------------------------------------
// TAGS — invalidation groups. A write busts the tag; every key under it dies.
// ---------------------------------------------------------------------------

export const cacheTags = {
  platformStats: () => "t:platform-stats",
  platformSchools: () => "t:platform-schools",
  schoolStats: (schoolId: string) => `t:school-stats:${schoolId}`,
  branding: (schoolId: string) => `t:branding:${schoolId}`,
  // School profile is keyed by schoolCode because every mutation that touches it
  // (branding, code change, session start, subscription, delete) has the code.
  schoolByCode: (schoolCode: string) => `t:school-by-code:${schoolCode}`,
  subscription: (schoolId: string) => `t:subscription:${schoolId}`,

  leaderboard: (schoolId: string) => `t:leaderboard:${schoolId}`,
  leaderboardQuiz: (quizId: string) => `t:leaderboard-quiz:${quizId}`,
  arenaProfile: (studentId: string) => `t:arena-profile:${studentId}`,

  calendar: (schoolId: string) => `t:calendar:${schoolId}`,
  timetable: (schoolId: string) => `t:timetable:${schoolId}`,
  timetableUser: (userId: string) => `t:timetable-user:${userId}`,
  timetableGroups: (schoolId: string) => `t:timetable-groups:${schoolId}`,

  classes: (schoolId: string) => `t:classes:${schoolId}`,
  classTeachers: (schoolId: string) => `t:class-teachers:${schoolId}`,
  classLog: (schoolId: string) => `t:class-log:${schoolId}`,
  sessions: (schoolId: string) => `t:sessions:${schoolId}`,
  birthdays: (schoolId: string) => `t:birthdays:${schoolId}`,

  students: (schoolId: string) => `t:students:${schoolId}`,
  teachers: (schoolId: string) => `t:teachers:${schoolId}`,
  admins: (schoolId: string) => `t:admins:${schoolId}`,

  attendance: (schoolId: string) => `t:attendance:${schoolId}`,
  attendanceStudent: (studentId: string) => `t:attendance-student:${studentId}`,

  notif: (userId: string) => `t:notif:${userId}`,
  // Busted when a notification is created/deleted (affects every recipient in the
  // school) — avoids fanning out to each recipient's per-user tag.
  notifSchool: (schoolId: string) => `t:notif-school:${schoolId}`,

  fees: (schoolId: string) => `t:fees:${schoolId}`,
  feesStudent: (studentId: string) => `t:fees-student:${studentId}`,

  digitalId: (userId: string) => `t:digital-id:${userId}`,
  profile: (userId: string) => `t:profile:${userId}`,
} as const

// ---------------------------------------------------------------------------
// KEYS — the exact storage key for each cached value.
// ---------------------------------------------------------------------------

export const cacheKeys = {
  platformStats: () => "platform-stats",
  platformSchools: () => "platform-schools",
  schoolStats: (schoolId: string) => `school-stats:${schoolId}`,
  schoolFeesSummary: (schoolId: string) => `school-fees-summary:${schoolId}`,
  branding: (schoolId: string) => `branding:${schoolId}`,
  schoolByCode: (schoolCode: string) => `school-by-code:${schoolCode}`,
  subscriptionHistory: (schoolId: string) => `subscription-history:${schoolId}`,

  leaderboard: (schoolId: string, scope: string) => `leaderboard:${schoolId}:${scope}`,
  leaderboardOverview: (schoolId: string) => `leaderboard-overview:${schoolId}`,
  leaderboardQuiz: (quizId: string) => `leaderboard-quiz:${quizId}`,
  arenaProfile: (studentId: string, scope: string) => `arena-profile:${studentId}:${scope}`,
  arenaMonths: (schoolId: string) => `arena-months:${schoolId}`,

  calendar: (schoolId: string, scope: string) => `calendar:${schoolId}:${scope}`,

  timetableToday: (userId: string, date: string) => `timetable-today:${userId}:${date}`,
  timetableMy: (userId: string) => `timetable-my:${userId}`,
  timetable: (schoolId: string, scope: string) => `timetable:${schoolId}:${scope}`,
  periods: (schoolId: string) => `periods:${schoolId}`,
  timetableGroups: (schoolId: string) => `timetable-groups:${schoolId}`,
  timetableGroupClasses: (groupId: string) => `timetable-group-classes:${groupId}`,
  timetableGroupAvailableClasses: (schoolId: string) => `timetable-group-available:${schoolId}`,

  classes: (schoolId: string) => `classes:${schoolId}`,
  classSections: (schoolId: string) => `class-sections:${schoolId}`,
  quizClasses: (schoolId: string) => `quiz-classes:${schoolId}`,
  classTeachers: (schoolId: string, scope: string) => `class-teachers:${schoolId}:${scope}`,
  classLog: (schoolId: string, scope: string) => `class-log:${schoolId}:${scope}`,
  sessions: (schoolId: string) => `sessions:${schoolId}`,
  birthdays: (schoolId: string, date: string) => `birthdays:${schoolId}:${date}`,

  students: (schoolId: string, scope: string) => `students:${schoolId}:${scope}`,
  teachers: (schoolId: string, scope: string) => `teachers:${schoolId}:${scope}`,
  admins: (schoolId: string) => `admins:${schoolId}`,

  attendanceSummary: (schoolId: string, scope: string) => `attendance-summary:${schoolId}:${scope}`,
  attendanceStudentStats: (studentId: string) => `attendance-student-stats:${studentId}`,
  attendanceStudentMonthly: (studentId: string, scope: string) =>
    `attendance-student-monthly:${studentId}:${scope}`,
  teacherAttendanceSummary: (schoolId: string) => `teacher-attendance-summary:${schoolId}`,
  teacherAttendanceMonthly: (schoolId: string, scope: string) =>
    `teacher-attendance-monthly:${schoolId}:${scope}`,

  notifInbox: (userId: string, scope: string) => `notif-inbox:${userId}:${scope}`,
  notifUnread: (userId: string) => `notif-unread:${userId}`,

  feesLedger: (schoolId: string, scope: string) => `fees-ledger:${schoolId}:${scope}`,
  feesStudentLedger: (studentId: string, scope: string) => `fees-student-ledger:${studentId}:${scope}`,
  feesStructures: (schoolId: string, scope: string) => `fees-structures:${schoolId}:${scope}`,
  feesStructure: (structureId: string) => `fees-structure:${structureId}`,
  feesMonthlyBlocks: (schoolId: string, scope: string) => `fees-monthly-blocks:${schoolId}:${scope}`,
  feesTransactions: (schoolId: string, scope: string) => `fees-transactions:${schoolId}:${scope}`,
  feesPending: (schoolId: string) => `fees-pending:${schoolId}`,
  feesWaivers: (schoolId: string, scope: string) => `fees-waivers:${schoolId}:${scope}`,

  digitalId: (userId: string) => `digital-id:${userId}`,
  digitalIdPublic: (token: string) => `digital-id-public:${token}`,
  profile: (userId: string) => `profile:${userId}`,

  // School-suspension check, cached briefly (TTL-only) to spare the DB when the
  // jwt callback runs it per server-side auth(). Keyed per user.
  suspension: (userId: string) => `suspension:${userId}`,
} as const
