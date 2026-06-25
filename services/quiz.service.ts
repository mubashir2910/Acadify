import { prisma } from "@/lib/prisma"
import type { CreateQuizInput } from "@/schemas/quiz.schema"
import { computeEffectiveStatus } from "@/lib/quiz-status"
import { getSchoolClassSections as fetchClassSections } from "@/services/class.service"
import { cached } from "@/lib/cache"
import { cacheKeys, cacheTags, serializeParams } from "@/lib/cache-keys"

// ─── Helpers ───────────────────────────────────────────────────────────────

async function resolveCreatorSchoolId(userId: string, role: string): Promise<string> {
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({
      where: { user_id: userId },
      select: { school_id: true },
    })
    if (!teacher) throw new Error("TEACHER_NOT_FOUND")
    return teacher.school_id
  }

  if (role === "ADMIN") {
    const su = await prisma.schoolUser.findFirst({
      where: { user_id: userId, role: "ADMIN", status: "ACTIVE" },
      select: { school_id: true },
    })
    if (!su) throw new Error("ADMIN_NOT_FOUND")
    return su.school_id
  }

  throw new Error("UNAUTHORIZED")
}

// Aggregate submitted-attempt stats (avg score + count) for a set of quizzes in
// ONE grouped query, keyed by quiz_id. Used by the admin list / leaderboard
// overview so we never load every attempt row just to summarise it.
// avgScore uses sum/count (null score treated as 0) to match the prior in-JS math.
async function aggregateSubmittedStats(
  quizIds: string[],
): Promise<Map<string, { count: number; avgScore: number | null }>> {
  const map = new Map<string, { count: number; avgScore: number | null }>()
  if (quizIds.length === 0) return map

  const groups = await prisma.quizAttempt.groupBy({
    by: ["quiz_id"],
    where: { quiz_id: { in: quizIds }, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
    _sum: { score: true },
    _count: { _all: true },
  })

  for (const g of groups) {
    const count = g._count._all
    map.set(g.quiz_id, {
      count,
      avgScore: count > 0 ? Math.round((g._sum.score ?? 0) / count) : null,
    })
  }
  return map
}

// ─── Create Quiz ───────────────────────────────────────────────────────────

export async function createQuiz(
  creatorUserId: string,
  creatorRole: string,
  data: CreateQuizInput
) {
  const schoolId = await resolveCreatorSchoolId(creatorUserId, creatorRole)

  // Validate class+section has at least one active student
  const studentCount = await prisma.student.count({
    where: {
      school_id: schoolId,
      class: data.class,
      section: data.section,
      status: "ACTIVE",
    },
  })
  if (studentCount === 0) throw new Error("CLASS_SECTION_NOT_FOUND")

  // Compute duration from start/end times
  const durationMins = Math.floor(
    (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60_000
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quiz = await prisma.$transaction(async (tx: any) => {
    const created = await tx.quiz.create({
      data: {
        school_id: schoolId,
        created_by: creatorUserId,
        title: data.title,
        subject: data.subject,
        subject_group: data.subjectGroup,
        instructions: data.instructions ?? null,
        class: data.class,
        section: data.section,
        total_marks: data.totalPoints,
        duration_mins: durationMins,
        start_time: new Date(data.startTime),
        end_time: new Date(data.endTime),
        shuffle_questions: data.shuffleQuestions,
        shuffle_options: data.shuffleOptions,
        // Auto-activate: quiz is immediately ACTIVE, time gates access
        status: "ACTIVE",
        questions: {
          create: data.questions.map((q) => ({
            text: q.text,
            type: q.type,
            marks: q.marks,
            time_limit_secs: q.timeLimitSecs,
            order: q.order,
            correct_answer: q.correctAnswer ?? null,
            options:
              q.type === "MCQ" && q.options
                ? {
                    create: q.options.map((o) => ({
                      text: o.text,
                      is_correct: o.isCorrect,
                      order: o.order,
                    })),
                  }
                : undefined,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        subject: true,
        subject_group: true,
        class: true,
        section: true,
        status: true,
        total_marks: true,
        duration_mins: true,
        start_time: true,
        end_time: true,
        _count: { select: { questions: true } },
      },
    })
    return created
  })

  return quiz
}

// ─── Get Quizzes for Creator (Teacher or Admin own) ────────────────────────

export async function getCreatorQuizzes(creatorUserId: string) {
  const quizzes = await prisma.quiz.findMany({
    where: { created_by: creatorUserId },
    orderBy: { start_time: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      subject_group: true,
      class: true,
      section: true,
      status: true,
      total_marks: true,
      duration_mins: true,
      start_time: true,
      end_time: true,
      created_at: true,
      _count: { select: { questions: true, attempts: true } },
    },
  })

  return quizzes.map((q) => ({
    ...q,
    effectiveStatus: computeEffectiveStatus(q.status, q.start_time, q.end_time),
  }))
}

// ─── Get All School Quizzes (Admin) ───────────────────────────────────────

export async function getAdminQuizzes(adminUserId: string) {
  const su = await prisma.schoolUser.findFirst({
    where: { user_id: adminUserId, role: "ADMIN", status: "ACTIVE" },
    select: { school_id: true },
  })
  if (!su) throw new Error("ADMIN_NOT_FOUND")

  const quizzes = await prisma.quiz.findMany({
    where: { school_id: su.school_id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      subject_group: true,
      class: true,
      section: true,
      status: true,
      total_marks: true,
      duration_mins: true,
      start_time: true,
      end_time: true,
      created_at: true,
      creator: { select: { name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  })

  // Avg score + submitted count via one grouped query instead of loading every
  // submitted attempt inline per quiz (previously unbounded).
  const statsByQuiz = await aggregateSubmittedStats(quizzes.map((q) => q.id))

  return quizzes.map((q) => {
    const st = statsByQuiz.get(q.id)
    return {
      ...q,
      submittedCount: st?.count ?? 0,
      avgScore: st?.avgScore ?? null,
      effectiveStatus: computeEffectiveStatus(q.status, q.start_time, q.end_time),
    }
  })
}

// ─── Get Available Quizzes for Student ────────────────────────────────────

export async function getStudentAvailableQuizzes(studentUserId: string) {
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId },
    select: { class: true, section: true, school_id: true },
  })
  if (!student) throw new Error("STUDENT_NOT_FOUND")

  const quizzes = await prisma.quiz.findMany({
    where: {
      school_id: student.school_id,
      class: student.class,
      section: student.section,
      status: { in: ["ACTIVE", "CLOSED"] },
    },
    orderBy: { start_time: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      subject_group: true,
      class: true,
      section: true,
      status: true,
      total_marks: true,
      duration_mins: true,
      per_question_time_secs: true,
      start_time: true,
      end_time: true,
      _count: { select: { questions: true } },
      attempts: {
        where: { student_id: studentUserId },
        select: { id: true, status: true, score: true, started_at: true, submitted_at: true },
        take: 1,
      },
    },
  })

  return quizzes.map((q) => {
    const attempt = q.attempts[0] ?? null
    const { attempts, ...rest } = q
    return {
      ...rest,
      attempt,
      effectiveStatus: computeEffectiveStatus(rest.status, rest.start_time, rest.end_time),
    }
  })
}

// ─── Get Class+Section List for Create Form ───────────────────────────────

export async function getSchoolClassSections(userId: string, role: string) {
  const schoolId = await resolveCreatorSchoolId(userId, role)
  return fetchClassSections(schoolId)
}

// ─── Get Quiz Detail ──────────────────────────────────────────────────────

export async function getQuizDetail(quizId: string, userId: string, role: string) {
  // Meta + counts only — no question text/options here, so the Challenge Details
  // view stays light and never leaks question content before an attempt starts.
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      school_id: true,
      created_by: true,
      title: true,
      subject: true,
      subject_group: true,
      instructions: true,
      class: true,
      section: true,
      status: true,
      total_marks: true,
      duration_mins: true,
      per_question_time_secs: true,
      start_time: true,
      end_time: true,
      shuffle_questions: true,
      shuffle_options: true,
      creator: { select: { name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  })

  if (!quiz) throw new Error("QUIZ_NOT_FOUND")

  // ── Tenant / ownership gate ────────────────────────────────────────────────
  // Without this, any authenticated user could read another school's quiz (and,
  // for staff, its full questions + answer key) just by knowing the id. Mirrors
  // the checks in updateQuizStatus / getQuizLeaderboard. Deny-by-default for any
  // role not handled below.
  let studentAttempt: { status: string } | null = null
  if (role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { user_id: userId },
      select: { school_id: true, class: true, section: true },
    })
    if (!student || student.school_id !== quiz.school_id) throw new Error("FORBIDDEN")
    // A student may view a quiz available to their class/section, or any quiz they
    // have already attempted (so result review keeps working if they later change
    // class/section). Question content stays gated behind having an attempt below.
    studentAttempt = await prisma.quizAttempt.findUnique({
      where: { quiz_id_student_id: { quiz_id: quizId, student_id: userId } },
      select: { status: true },
    })
    const inClassSection = student.class === quiz.class && student.section === quiz.section
    if (!inClassSection && !studentAttempt) throw new Error("FORBIDDEN")
  } else if (role === "TEACHER") {
    if (quiz.created_by !== userId) throw new Error("FORBIDDEN")
  } else if (role === "ADMIN") {
    const su = await prisma.schoolUser.findFirst({
      where: { user_id: userId, role: "ADMIN", school_id: quiz.school_id, status: "ACTIVE" },
      select: { id: true },
    })
    if (!su) throw new Error("FORBIDDEN")
  } else {
    throw new Error("FORBIDDEN")
  }

  // Real quiz length = sum of per-question time limits (cheap aggregate, no content)
  const timeAgg = await prisma.question.aggregate({
    where: { quiz_id: quizId },
    _sum: { time_limit_secs: true },
  })

  const base = {
    ...quiz,
    total_time_secs: timeAgg._sum.time_limit_secs ?? 0,
    effectiveStatus: computeEffectiveStatus(quiz.status, quiz.start_time, quiz.end_time),
  }

  // Question content is served to staff always, but to a student only once they
  // actually have an attempt (so the attempt screen + result review work). Before
  // starting, a student gets aggregates only — they can't pre-read the questions.
  const includeQuestions = role !== "STUDENT" || !!studentAttempt

  if (!includeQuestions) {
    return { ...base, questions: [] as const }
  }

  const questions = await prisma.question.findMany({
    where: { quiz_id: quizId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      text: true,
      type: true,
      marks: true,
      time_limit_secs: true,
      order: true,
      correct_answer: true,
      options: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, is_correct: true, order: true },
      },
    },
  })

  // Students must not see correct answers
  if (role === "STUDENT") {
    return {
      ...base,
      questions: questions.map((q) => ({
        ...q,
        correct_answer: undefined,
        options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
      })),
    }
  }

  return { ...base, questions }
}

// ─── Update Quiz Status (Early Close only) ────────────────────────────────

export async function updateQuizStatus(
  quizId: string,
  userId: string,
  role: string,
  status: "CLOSED"
) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, school_id: true, created_by: true, status: true },
  })
  if (!quiz) throw new Error("QUIZ_NOT_FOUND")

  // Authorization
  if (role === "TEACHER" && quiz.created_by !== userId) throw new Error("FORBIDDEN")
  if (role === "ADMIN") {
    const su = await prisma.schoolUser.findFirst({
      where: { user_id: userId, role: "ADMIN", school_id: quiz.school_id, status: "ACTIVE" },
    })
    if (!su) throw new Error("FORBIDDEN")
  }

  if (quiz.status === "CLOSED") throw new Error("ALREADY_CLOSED")

  return prisma.quiz.update({
    where: { id: quizId },
    data: { status: "CLOSED" },
    select: { id: true, status: true },
  })
}

// ─── Delete Quiz ───────────────────────────────────────────────────────────

export async function deleteQuiz(quizId: string, userId: string, role: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      school_id: true,
      created_by: true,
      status: true,
      _count: { select: { attempts: true } },
    },
  })
  if (!quiz) throw new Error("QUIZ_NOT_FOUND")

  // Can only delete if no attempts have been made
  if (quiz._count.attempts > 0) throw new Error("CANNOT_DELETE_QUIZ_WITH_ATTEMPTS")

  if (role === "TEACHER" && quiz.created_by !== userId) throw new Error("FORBIDDEN")
  if (role === "ADMIN") {
    const su = await prisma.schoolUser.findFirst({
      where: { user_id: userId, role: "ADMIN", school_id: quiz.school_id, status: "ACTIVE" },
    })
    if (!su) throw new Error("FORBIDDEN")
  }

  await prisma.quiz.delete({ where: { id: quizId } })
}

// ─── Per-Quiz Leaderboard ─────────────────────────────────────────────────

export async function getQuizLeaderboard(quizId: string, userId: string, role: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, school_id: true, created_by: true, total_marks: true, title: true, subject: true, subject_group: true, class: true, section: true },
  })
  if (!quiz) throw new Error("QUIZ_NOT_FOUND")

  // Authorization
  if (role === "TEACHER" && quiz.created_by !== userId) throw new Error("FORBIDDEN")
  if (role === "STUDENT") {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { quiz_id_student_id: { quiz_id: quizId, student_id: userId } },
      select: { status: true },
    })
    if (!attempt || attempt.status === "IN_PROGRESS") throw new Error("NOT_SUBMITTED")
  }
  if (role === "ADMIN") {
    const su = await prisma.schoolUser.findFirst({
      where: { user_id: userId, role: "ADMIN", school_id: quiz.school_id, status: "ACTIVE" },
    })
    if (!su) throw new Error("FORBIDDEN")
  }

  // Cache the per-quiz ranked rows (shared across viewers). The per-viewer
  // `isCurrentUser` flag is applied AFTER the cache so one student's request can't
  // poison another's. Busted when any attempt for this quiz is submitted.
  const ranked = await cached(
    cacheKeys.leaderboardQuiz(quizId),
    {
      ttl: 300,
      tags: [cacheTags.leaderboardQuiz(quizId), cacheTags.leaderboard(quiz.school_id)],
    },
    () => buildQuizLeaderboardRows(quizId, quiz.total_marks),
  )

  return ranked.map((row) => ({
    rank: row.rank,
    name: row.name,
    avatarUrl: row.avatarUrl,
    isCurrentUser: row.studentId === userId,
    score: row.score,
    totalMarks: row.totalMarks,
    submittedAt: row.submittedAt,
    timeTakenMs: row.timeTakenMs,
  }))
}

async function buildQuizLeaderboardRows(quizId: string, totalMarks: number) {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      quiz_id: quizId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    select: {
      score: true,
      started_at: true,
      submitted_at: true,
      student: { select: { id: true, name: true, profile_picture: true } },
    },
  })

  // Rank by score desc, then by total time-taken asc (ties broken by who finished
  // faster) — same rule as the monthly/accumulated arena leaderboard. Missing
  // timing sorts last. Prisma can't order by the computed duration, so sort in JS.
  const ranked = attempts
    .map((a) => ({
      ...a,
      timeTakenMs:
        a.submitted_at && a.started_at
          ? a.submitted_at.getTime() - a.started_at.getTime()
          : Number.POSITIVE_INFINITY,
    }))
    .sort((x, y) => {
      if ((y.score ?? 0) !== (x.score ?? 0)) return (y.score ?? 0) - (x.score ?? 0)
      return x.timeTakenMs - y.timeTakenMs
    })

  let rank = 1
  return ranked.map((a, i) => {
    if (i > 0) {
      const prev = ranked[i - 1]
      if ((a.score ?? 0) !== (prev.score ?? 0) || a.timeTakenMs !== prev.timeTakenMs) {
        rank = i + 1
      }
    }
    return {
      rank,
      studentId: a.student.id,
      name: a.student.name,
      avatarUrl: a.student.profile_picture ?? null,
      score: a.score ?? 0,
      totalMarks,
      submittedAt: a.submitted_at,
      timeTakenMs: Number.isFinite(a.timeTakenMs) ? a.timeTakenMs : null,
    }
  })
}

// ─── Admin Leaderboard Overview ───────────────────────────────────────────

export async function getAdminLeaderboardOverview(adminUserId: string) {
  const su = await prisma.schoolUser.findFirst({
    where: { user_id: adminUserId, role: "ADMIN", status: "ACTIVE" },
    select: { school_id: true },
  })
  if (!su) throw new Error("ADMIN_NOT_FOUND")

  return cached(
    cacheKeys.leaderboardOverview(su.school_id),
    { ttl: 300, tags: [cacheTags.leaderboard(su.school_id)] },
    () => buildAdminLeaderboardOverview(su.school_id),
  )
}

async function buildAdminLeaderboardOverview(schoolId: string) {
  const quizzes = await prisma.quiz.findMany({
    where: { school_id: schoolId, status: { in: ["ACTIVE", "CLOSED"] } },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      subject_group: true,
      class: true,
      section: true,
      status: true,
      total_marks: true,
      start_time: true,
      end_time: true,
      creator: { select: { name: true } },
      _count: { select: { attempts: true } },
      // Only the single top-scoring attempt is needed for the overview card, so
      // bound the nested load with take:1 instead of pulling every submitted row.
      attempts: {
        where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
        select: { score: true, student: { select: { name: true } } },
        orderBy: { score: "desc" },
        take: 1,
      },
    },
  })

  // Avg score + submitted count come from one grouped query (the nested take:1
  // above only supplies the top scorer).
  const statsByQuiz = await aggregateSubmittedStats(quizzes.map((q) => q.id))

  return quizzes.map((q) => {
    const top = q.attempts[0] ?? null
    const st = statsByQuiz.get(q.id)
    const { attempts, ...rest } = q
    return {
      ...rest,
      submittedCount: st?.count ?? 0,
      avgScore: st?.avgScore ?? null,
      topScore: top?.score ?? null,
      topScorer: top?.student.name ?? null,
      effectiveStatus: computeEffectiveStatus(rest.status, rest.start_time, rest.end_time),
    }
  })
}

// ─── Monthly Arena Leaderboard ────────────────────────────────────────────

export async function getMonthlyLeaderboard(
  userId: string,
  role: string,
  month: string, // "YYYY-MM"
  classSection?: { class: string; section: string }
) {
  const { schoolId, classFilter } = await resolveArenaScope(userId, role)

  const effectiveClassFilter = role === "STUDENT"
    ? (classFilter ?? {})
    : classSection
    ? { class: classSection.class, section: classSection.section }
    : (classFilter ?? {})

  const [year, mon] = month.split("-").map(Number)
  const monthStart = new Date(year, mon - 1, 1)
  const monthEnd = new Date(year, mon, 1) // exclusive

  const scope = serializeParams({ kind: "monthly", month, ...effectiveClassFilter })
  const rows = await cached(
    cacheKeys.leaderboard(schoolId, scope),
    { ttl: 300, tags: [cacheTags.leaderboard(schoolId)] },
    () => buildLeaderboard(schoolId, effectiveClassFilter, { gte: monthStart, lt: monthEnd }),
  )
  return applyCurrentUser(rows, userId)
}

// ─── Accumulated Arena Leaderboard ───────────────────────────────────────

export async function getAccumulatedLeaderboard(
  userId: string,
  role: string,
  classSection?: { class: string; section: string }
) {
  const { schoolId, classFilter } = await resolveArenaScope(userId, role)

  const effectiveClassFilter = role === "STUDENT"
    ? (classFilter ?? {})
    : classSection
    ? { class: classSection.class, section: classSection.section }
    : (classFilter ?? {})

  const scope = serializeParams({ kind: "accumulated", ...effectiveClassFilter })
  const rows = await cached(
    cacheKeys.leaderboard(schoolId, scope),
    { ttl: 300, tags: [cacheTags.leaderboard(schoolId)] },
    () => buildLeaderboard(schoolId, effectiveClassFilter, null),
  )
  return applyCurrentUser(rows, userId)
}

// ─── Arena Available Months (from School.session_started_on) ──────────────
// Returns months from the school's session start (super-admin-set) up to the
// current month, newest first. Falls back to last 12 months if session start
// is null. Capped at 60 entries.
//
// All arithmetic is done in UTC: `session_started_on` is stored as UTC midnight
// of a DATE column, so mixing local-TZ Date construction with it would drop
// the anchor month in some server timezones.

export async function getArenaAvailableMonths(userId: string, role: string) {
  const { schoolId } = await resolveArenaScope(userId, role)
  // Pure-TTL cache: this list only shifts on month rollover or a super-admin
  // changing session_started_on, so a short TTL is enough (no event wiring).
  return cached(
    cacheKeys.arenaMonths(schoolId),
    { ttl: 600 },
    () => buildArenaAvailableMonths(schoolId),
  )
}

async function buildArenaAvailableMonths(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { session_started_on: true },
  })

  const now = new Date()
  const nowYear = now.getUTCFullYear()
  const nowMonth = now.getUTCMonth() // 0..11

  const fallback = new Date(Date.UTC(nowYear, nowMonth - 11, 1))
  const anchor = school?.session_started_on ?? fallback
  const anchorYear = anchor.getUTCFullYear()
  const anchorMonth = anchor.getUTCMonth()

  const months: { value: string; label: string }[] = []
  let cy = nowYear
  let cm = nowMonth
  for (let i = 0; i < 60; i++) {
    if (cy < anchorYear || (cy === anchorYear && cm < anchorMonth)) break
    const mm = String(cm + 1).padStart(2, "0")
    months.push({
      value: `${cy}-${mm}`,
      label: new Date(Date.UTC(cy, cm, 1)).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    })
    cm -= 1
    if (cm < 0) {
      cm = 11
      cy -= 1
    }
  }

  return {
    months,
    meta: {
      sessionStartedOn: school?.session_started_on ?? null,
      anchorYear,
      anchorMonth: anchorMonth + 1, // 1-based for human readability
      nowUtc: now.toISOString(),
    },
  }
}

// ─── Arena Scope Helper ───────────────────────────────────────────────────

async function resolveArenaScope(userId: string, role: string) {
  if (role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { user_id: userId },
      select: { school_id: true, class: true, section: true },
    })
    if (!student) throw new Error("STUDENT_NOT_FOUND")
    return {
      schoolId: student.school_id,
      // Scope to student's own class+section
      classFilter: { class: student.class, section: student.section } as Record<string, string>,
    }
  }

  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({
      where: { user_id: userId },
      select: { school_id: true },
    })
    if (!teacher) throw new Error("TEACHER_NOT_FOUND")
    return { schoolId: teacher.school_id, classFilter: null }
  }

  if (role === "ADMIN") {
    const su = await prisma.schoolUser.findFirst({
      where: { user_id: userId, role: "ADMIN", status: "ACTIVE" },
      select: { school_id: true },
    })
    if (!su) throw new Error("ADMIN_NOT_FOUND")
    return { schoolId: su.school_id, classFilter: null }
  }

  throw new Error("UNAUTHORIZED")
}

// ─── Leaderboard Aggregation Helper (DB-level) ───────────────────────────
// Uses a 3-step approach to avoid loading all attempt rows into memory:
// 1. Fetch matching quiz IDs (small)
// 2. groupBy student for score sums (DB aggregation)
// 3. Fetch timing rows only for top students (bounded)

async function buildLeaderboard(
  schoolId: string,
  classFilter: Record<string, string>,
  timeRange: { gte: Date; lt: Date } | null,
) {
  // Step 1: Resolve quiz IDs matching school/class/time filter.
  // Include both ACTIVE and CLOSED — `QuizAttempt.status` filter below already
  // restricts to finished submissions, so a contest's lifecycle status is not
  // the right gate for leaderboard inclusion.
  const quizIds = await prisma.quiz.findMany({
    where: {
      school_id: schoolId,
      status: { in: ["ACTIVE", "CLOSED"] },
      ...classFilter,
      ...(timeRange ? { start_time: timeRange } : {}),
    },
    select: { id: true },
  }).then((qs) => qs.map((q) => q.id))

  if (quizIds.length === 0) return []

  // Step 2: Aggregate scores per student at DB level
  const scoreGroups = await prisma.quizAttempt.groupBy({
    by: ["student_id"],
    where: {
      quiz_id: { in: quizIds },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    _sum: { score: true },
    orderBy: { _sum: { score: "desc" } },
    take: 200,
  })

  if (scoreGroups.length === 0) return []

  const topStudentIds = scoreGroups.map((g) => g.student_id)

  // Step 3: Fetch names + avatars + timing rows for top students only
  const [userMap, timeAttempts] = await Promise.all([
    prisma.user
      .findMany({
        where: { id: { in: topStudentIds } },
        select: { id: true, name: true, profile_picture: true },
      })
      .then((users) => new Map(users.map((u) => [u.id, u]))),
    prisma.quizAttempt.findMany({
      where: {
        student_id: { in: topStudentIds },
        quiz_id: { in: quizIds },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      },
      select: { student_id: true, started_at: true, submitted_at: true },
    }),
  ])

  // Aggregate timing per student in JS (bounded: only top students)
  const timingMap = new Map<string, number>()
  for (const a of timeAttempts) {
    const t = a.submitted_at ? a.submitted_at.getTime() - a.started_at.getTime() : 0
    timingMap.set(a.student_id, (timingMap.get(a.student_id) ?? 0) + t)
  }

  // Build and sort leaderboard
  const entries = scoreGroups.map((g) => {
    const user = userMap.get(g.student_id)
    return {
      studentId: g.student_id,
      name: user?.name ?? "Unknown",
      avatarUrl: user?.profile_picture ?? null,
      totalPoints: g._sum.score ?? 0,
      totalTimeMs: timingMap.get(g.student_id) ?? 0,
    }
  })

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    return a.totalTimeMs - b.totalTimeMs
  })

  // Assign ranks with tie handling
  let rank = 1
  return entries.map((entry, i) => {
    if (i > 0) {
      const prev = entries[i - 1]
      if (entry.totalPoints !== prev.totalPoints || entry.totalTimeMs !== prev.totalTimeMs) {
        rank = i + 1
      }
    }
    return {
      rank,
      studentId: entry.studentId,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      totalPoints: entry.totalPoints,
      totalTimeMs: entry.totalTimeMs,
    }
  })
}

/** Applies the per-viewer `isCurrentUser` flag to cached, shared leaderboard rows
 *  and strips the internal studentId. Keeps the cache tenant/user-agnostic. */
function applyCurrentUser(
  rows: Awaited<ReturnType<typeof buildLeaderboard>>,
  currentUserId?: string,
) {
  return rows.map(({ studentId, ...rest }) => ({
    ...rest,
    isCurrentUser: currentUserId ? studentId === currentUserId : false,
  }))
}

// ─── Student Quiz Result (per-question breakdown) ─────────────────────────

export async function getStudentQuizResult(quizId: string, studentUserId: string) {
  // Verify student has a completed attempt
  const attempt = await prisma.quizAttempt.findUnique({
    where: { quiz_id_student_id: { quiz_id: quizId, student_id: studentUserId } },
    select: {
      status: true,
      score: true,
      started_at: true,
      submitted_at: true,
      answers: {
        select: {
          question_id: true,
          given_answer: true,
          is_correct: true,
          marks_awarded: true,
        },
      },
    },
  })

  if (!attempt || attempt.status === "IN_PROGRESS") throw new Error("NOT_SUBMITTED")

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      title: true,
      subject: true,
      subject_group: true,
      total_marks: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          text: true,
          type: true,
          marks: true,
          time_limit_secs: true,
          correct_answer: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, is_correct: true },
          },
        },
      },
    },
  })

  if (!quiz) throw new Error("QUIZ_NOT_FOUND")

  const answerMap = new Map(attempt.answers.map((a) => [a.question_id, a]))

  const timeTakenMs =
    attempt.submitted_at
      ? attempt.submitted_at.getTime() - attempt.started_at.getTime()
      : null

  return {
    title: quiz.title,
    subject: quiz.subject,
    subject_group: quiz.subject_group,
    total_marks: quiz.total_marks,
    score: attempt.score ?? 0,
    status: attempt.status,
    timeTakenMs,
    questions: quiz.questions.map((q) => {
      const ans = answerMap.get(q.id)
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        marks: q.marks,
        time_limit_secs: q.time_limit_secs,
        correct_answer: q.correct_answer,
        options: q.options,
        studentAnswer: {
          givenAnswer: ans?.given_answer ?? null,
          isCorrect: ans?.is_correct ?? false,
          marksAwarded: ans?.marks_awarded ?? 0,
        },
      }
    }),
  }
}
