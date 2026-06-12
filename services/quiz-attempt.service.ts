import { prisma } from "@/lib/prisma"

// ─── Seeded shuffle (Fisher-Yates with string seed) ───────────────────────

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return function () {
    h ^= h << 13
    h ^= h >> 17
    h ^= h << 5
    return ((h >>> 0) / 4294967296)
  }
}

function shuffleWithSeed<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  const rand = seededRandom(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Start Attempt ─────────────────────────────────────────────────────────

export async function startAttempt(quizId: string, studentUserId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      school_id: true,
      class: true,
      section: true,
      status: true,
      duration_mins: true,
      per_question_time_secs: true,
      start_time: true,
      end_time: true,
      shuffle_questions: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true },
      },
    },
  })

  if (!quiz) throw new Error("QUIZ_NOT_FOUND")
  if (quiz.status !== "ACTIVE") throw new Error("QUIZ_NOT_ACTIVE")

  const now = new Date()
  if (now < quiz.start_time) throw new Error("QUIZ_NOT_STARTED")
  if (now > quiz.end_time) throw new Error("QUIZ_ENDED")

  // Validate student belongs to this class/section
  const student = await prisma.student.findFirst({
    where: { user_id: studentUserId, school_id: quiz.school_id },
    select: { class: true, section: true },
  })
  if (!student) throw new Error("STUDENT_NOT_FOUND")
  if (student.class !== quiz.class || student.section !== quiz.section) {
    throw new Error("CLASS_MISMATCH")
  }

  // Return existing IN_PROGRESS attempt (idempotent)
  const existing = await prisma.quizAttempt.findUnique({
    where: { quiz_id_student_id: { quiz_id: quizId, student_id: studentUserId } },
    select: {
      id: true,
      status: true,
      started_at: true,
      question_order: true,
      answers: {
        select: { question_id: true, given_answer: true },
      },
    },
  })

  if (existing) {
    if (existing.status !== "IN_PROGRESS") throw new Error("ALREADY_SUBMITTED")
    return {
      attemptId: existing.id,
      questionOrder: existing.question_order,
      startedAt: existing.started_at,
      durationMins: quiz.duration_mins,
      perQuestionTimeSecs: quiz.per_question_time_secs,
      endTime: quiz.end_time,
      savedAnswers: Object.fromEntries(
        existing.answers.map((a: { question_id: string; given_answer: string | null }) => [a.question_id, a.given_answer])
      ),
      isResumed: true,
    }
  }

  const questionIds = quiz.questions.map((q: { id: string }) => q.id)
  const questionOrder = quiz.shuffle_questions
    ? shuffleWithSeed(questionIds, `${quizId}-${studentUserId}`)
    : questionIds

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attempt = await prisma.$transaction(async (tx: any) => {
    const created = await tx.quizAttempt.create({
      data: {
        quiz_id: quizId,
        student_id: studentUserId,
        question_order: questionOrder,
        answers: {
          create: questionIds.map((qId: string) => ({ question_id: qId })),
        },
      },
      select: { id: true, started_at: true },
    })
    return created
  })

  return {
    attemptId: attempt.id,
    questionOrder,
    startedAt: attempt.started_at,
    durationMins: quiz.duration_mins,
    perQuestionTimeSecs: quiz.per_question_time_secs,
    endTime: quiz.end_time,
    savedAnswers: {},
    isResumed: false,
  }
}

// ─── Get Attempt State (for reconnect) ────────────────────────────────────

export async function getAttemptState(quizId: string, studentUserId: string) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { quiz_id_student_id: { quiz_id: quizId, student_id: studentUserId } },
    select: {
      id: true,
      status: true,
      started_at: true,
      submitted_at: true,
      score: true,
      question_order: true,
      answers: {
        select: { question_id: true, given_answer: true },
      },
      quiz: {
        select: {
          duration_mins: true,
          per_question_time_secs: true,
          total_marks: true,
          end_time: true,
        },
      },
    },
  })

  if (!attempt) throw new Error("ATTEMPT_NOT_FOUND")

  return {
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    score: attempt.score,
    questionOrder: attempt.question_order,
    durationMins: attempt.quiz.duration_mins,
    perQuestionTimeSecs: attempt.quiz.per_question_time_secs,
    totalMarks: attempt.quiz.total_marks,
    endTime: attempt.quiz.end_time,
    savedAnswers: Object.fromEntries(
      attempt.answers.map((a: { question_id: string; given_answer: string | null }) => [a.question_id, a.given_answer])
    ),
  }
}

// ─── Save Answer (progressive) ────────────────────────────────────────────

export async function saveAnswer(
  quizId: string,
  studentUserId: string,
  questionId: string,
  givenAnswer: string | null
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { quiz_id_student_id: { quiz_id: quizId, student_id: studentUserId } },
    select: {
      id: true,
      status: true,
      started_at: true,
      quiz: { select: { end_time: true } },
    },
  })

  if (!attempt) throw new Error("ATTEMPT_NOT_FOUND")
  if (attempt.status !== "IN_PROGRESS") throw new Error("ALREADY_SUBMITTED")

  // Deadline is the contest end_time (when teacher closed the window)
  if (new Date() > attempt.quiz.end_time) throw new Error("TIME_EXPIRED")

  // Anchor for time-per-question = the most recent answered_at across all OTHER
  // answers on this attempt; fall back to attempt.started_at if none yet.
  // Cap at 900s (15 min) so idle/AFK time doesn't inflate analytics.
  const lastOtherAnswer = await prisma.quizAnswer.findFirst({
    where: {
      attempt_id: attempt.id,
      answered_at: { not: null },
      NOT: { question_id: questionId },
    },
    orderBy: { answered_at: "desc" },
    select: { answered_at: true },
  })

  const now = new Date()
  const anchor = lastOtherAnswer?.answered_at ?? attempt.started_at
  const elapsedSecs = Math.max(0, Math.round((now.getTime() - anchor.getTime()) / 1000))
  const timeTakenSecs = Math.min(elapsedSecs, 900)

  await prisma.quizAnswer.update({
    where: {
      attempt_id_question_id: { attempt_id: attempt.id, question_id: questionId },
    },
    data: {
      given_answer: givenAnswer,
      answered_at: now,
      time_taken_secs: timeTakenSecs,
    },
  })

  return { saved: true }
}

// ─── Submit Attempt ────────────────────────────────────────────────────────

export async function submitAttempt(quizId: string, studentUserId: string) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { quiz_id_student_id: { quiz_id: quizId, student_id: studentUserId } },
    select: {
      id: true,
      status: true,
      answers: {
        select: {
          id: true,
          question_id: true,
          given_answer: true,
          question: {
            select: {
              type: true,
              marks: true,
              correct_answer: true,
              options: {
                where: { is_correct: true },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
      quiz: {
        select: { end_time: true, total_marks: true },
      },
    },
  })

  if (!attempt) throw new Error("ATTEMPT_NOT_FOUND")
  if (attempt.status !== "IN_PROGRESS") throw new Error("ALREADY_SUBMITTED")

  // Allow 5s grace beyond contest end_time for network latency
  const graceDeadline = new Date(attempt.quiz.end_time.getTime() + 5000)
  const submittedAt = new Date()
  const isAutoSubmit = submittedAt > graceDeadline

  // Grade all answers in memory
  let totalScore = 0
  const answerUpdates: {
    id: string
    isCorrect: boolean
    marksAwarded: number
  }[] = []

  for (const ans of attempt.answers) {
    const { type, marks, correct_answer, options } = ans.question
    let isCorrect = false

    if (type === "MCQ") {
      const correctOptionId = options[0]?.id ?? null
      isCorrect = !!correctOptionId && ans.given_answer === correctOptionId
    } else {
      // FILL_BLANK / ONE_WORD — case-insensitive trim match
      const expected = (correct_answer ?? "").trim().toLowerCase()
      const given = (ans.given_answer ?? "").trim().toLowerCase()
      isCorrect = expected !== "" && given === expected
    }

    const marksAwarded = isCorrect ? marks : 0
    totalScore += marksAwarded
    answerUpdates.push({ id: ans.id, isCorrect, marksAwarded })
  }

  // Group correct answers by marks value to batch with updateMany (O(distinct marks) vs N queries)
  const incorrectIds = answerUpdates.filter((u) => !u.isCorrect).map((u) => u.id)
  const correctByMarks = new Map<number, string[]>()
  for (const u of answerUpdates) {
    if (u.isCorrect) {
      const ids = correctByMarks.get(u.marksAwarded) ?? []
      ids.push(u.id)
      correctByMarks.set(u.marksAwarded, ids)
    }
  }

  await prisma.$transaction([
    // One batch per distinct marks value (usually 1-3 distinct values in a quiz)
    ...Array.from(correctByMarks.entries()).map(([marks, ids]) =>
      prisma.quizAnswer.updateMany({
        where: { id: { in: ids } },
        data: { is_correct: true, marks_awarded: marks },
      })
    ),
    // All incorrect answers in a single batch
    ...(incorrectIds.length > 0
      ? [
          prisma.quizAnswer.updateMany({
            where: { id: { in: incorrectIds } },
            data: { is_correct: false, marks_awarded: 0 },
          }),
        ]
      : []),
    prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: isAutoSubmit ? "AUTO_SUBMITTED" : "SUBMITTED",
        score: totalScore,
        submitted_at: submittedAt,
      },
    }),
  ])

  // Compute rank after submit
  const betterCount = await prisma.quizAttempt.count({
    where: {
      quiz_id: quizId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      score: { gt: totalScore },
    },
  })

  return {
    score: totalScore,
    totalMarks: attempt.quiz.total_marks,
    rank: betterCount + 1,
    isAutoSubmit,
  }
}
