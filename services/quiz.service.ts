import { prisma } from "@/lib/prisma"
import type { CreateQuizInput } from "@/schemas/quiz.schema"
import { computeEffectiveStatus } from "@/lib/quiz-status"
import { getSchoolClassSections as fetchClassSections } from "@/services/class.service"

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
      attempts: {
        where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
        select: { score: true },
      },
    },
  })

  return quizzes.map((q) => {
    const submitted = q.attempts
    const avgScore =
      submitted.length > 0
        ? Math.round(submitted.reduce((s: number, a: { score: number | null }) => s + (a.score ?? 0), 0) / submitted.length)
        : null
    const { attempts, ...rest } = q
    return {
      ...rest,
      submittedCount: submitted.length,
      avgScore,
      effectiveStatus: computeEffectiveStatus(rest.status, rest.start_time, rest.end_time),
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
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      school_id: true,
      created_by: true,
      title: true,
      subject: true,
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
      questions: {
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
      },
      _count: { select: { attempts: true } },
    },
  })

  if (!quiz) throw new Error("QUIZ_NOT_FOUND")

  const withEffectiveStatus = {
    ...quiz,
    effectiveStatus: computeEffectiveStatus(quiz.status, quiz.start_time, quiz.end_time),
  }

  // Students must not see correct answers
  if (role === "STUDENT") {
    return {
      ...withEffectiveStatus,
      questions: quiz.questions.map((q) => ({
        ...q,
        correct_answer: undefined,
        options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
      })),
    }
  }

  return withEffectiveStatus
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
    select: { id: true, school_id: true, created_by: true, total_marks: true, title: true, subject: true, class: true, section: true },
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

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      quiz_id: quizId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    orderBy: [{ score: "desc" }, { submitted_at: "asc" }],
    select: {
      score: true,
      started_at: true,
      submitted_at: true,
      student: { select: { name: true } },
    },
  })

  let rank = 1
  return attempts.map((a, i) => {
    if (i > 0) {
      const prev = attempts[i - 1]
      if (a.score !== prev.score || a.submitted_at?.getTime() !== prev.submitted_at?.getTime()) {
        rank = i + 1
      }
    }
    const timeTakenMs =
      a.submitted_at && a.started_at
        ? a.submitted_at.getTime() - a.started_at.getTime()
        : null
    return {
      rank,
      name: a.student.name,
      score: a.score ?? 0,
      totalMarks: quiz.total_marks,
      submittedAt: a.submitted_at,
      timeTakenMs,
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

  const quizzes = await prisma.quiz.findMany({
    where: { school_id: su.school_id, status: { in: ["ACTIVE", "CLOSED"] } },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      class: true,
      section: true,
      status: true,
      total_marks: true,
      start_time: true,
      end_time: true,
      creator: { select: { name: true } },
      _count: { select: { attempts: true } },
      attempts: {
        where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
        select: { score: true, student: { select: { name: true } } },
        orderBy: { score: "desc" },
      },
    },
  })

  return quizzes.map((q) => {
    const submitted = q.attempts
    const scores = submitted.map((a: { score: number | null }) => a.score ?? 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : null
    const topScore = scores.length > 0 ? scores[0] : null
    const topScorer = submitted.length > 0 ? submitted[0].student.name : null
    const { attempts, ...rest } = q
    return {
      ...rest,
      submittedCount: submitted.length,
      avgScore,
      topScore,
      topScorer,
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

  return buildLeaderboard(schoolId, effectiveClassFilter, { gte: monthStart, lt: monthEnd })
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

  return buildLeaderboard(schoolId, effectiveClassFilter, null)
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
  timeRange: { gte: Date; lt: Date } | null
) {
  // Step 1: Resolve quiz IDs matching school/class/time filter
  const quizIds = await prisma.quiz.findMany({
    where: {
      school_id: schoolId,
      status: "CLOSED",
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

  // Step 3: Fetch names + timing rows for top students only
  const [nameMap, timeAttempts] = await Promise.all([
    prisma.user
      .findMany({ where: { id: { in: topStudentIds } }, select: { id: true, name: true } })
      .then((users) => new Map(users.map((u) => [u.id, u.name]))),
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
  const entries = scoreGroups.map((g) => ({
    name: nameMap.get(g.student_id) ?? "Unknown",
    totalPoints: g._sum.score ?? 0,
    totalTimeMs: timingMap.get(g.student_id) ?? 0,
  }))

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
    return { rank, name: entry.name, totalPoints: entry.totalPoints, totalTimeMs: entry.totalTimeMs }
  })
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
