import { prisma } from "@/lib/prisma"
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/schemas/quiz.schema"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SubjectStats {
  subject: string
  attempts: number
  avgScorePct: number
  accuracyPct: number
}

export interface SubjectGroupStats {
  subjectGroup: SubjectGroup
  label: string
  attempts: number
  avgScorePct: number
  accuracyPct: number
  avgTimePerQuestionSecs: number | null
  bySubject: SubjectStats[]
}

export interface MonthlyTrendEntry {
  month: string // YYYY-MM
  attempts: number
  avgScorePct: number
  accuracyPct: number
  totalPoints: number
  bySubjectGroup: { subjectGroup: SubjectGroup; attempts: number; avgScorePct: number }[]
}

export interface RecentAttemptEntry {
  quizId: string
  title: string
  subjectGroup: SubjectGroup
  subject: string
  submittedAt: Date | null
  score: number
  totalMarks: number
  accuracyPct: number
  timeTakenSecs: number | null
  isAutoSubmit: boolean
}

export interface StudentArenaProfile {
  studentId: string
  studentName: string
  class: string | null
  section: string | null
  generatedAt: Date
  windowMonths: number
  lifetime: {
    totalAttempts: number
    submittedAttempts: number
    autoSubmittedCount: number
    totalPoints: number
    totalMaxPoints: number
    avgScorePct: number
    accuracyPct: number
    totalAnsweredQuestions: number
    totalCorrectAnswers: number
    totalTimeSecs: number
    avgTimePerQuestionSecs: number | null
  }
  bySubjectGroup: SubjectGroupStats[]
  monthlyTrend: MonthlyTrendEntry[]
  recentAttempts: RecentAttemptEntry[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

function monthKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

// ─── Get Student Arena Profile ─────────────────────────────────────────────
// One structured payload designed for AI agent consumption.
// Aggregates submitted attempts by lifetime, subject-group, subject, month.
// Time stats exclude QuizAnswer rows with NULL time_taken_secs (pre-feature data).

export async function getStudentArenaProfile(
  studentUserId: string,
  monthsBack = 6
): Promise<StudentArenaProfile> {
  const windowMonths = Math.min(Math.max(1, monthsBack), 24)

  const [student, user] = await Promise.all([
    prisma.student.findFirst({
      where: { user_id: studentUserId },
      select: { class: true, section: true },
    }),
    prisma.user.findUnique({
      where: { id: studentUserId },
      select: { name: true },
    }),
  ])

  if (!user) throw new Error("STUDENT_NOT_FOUND")

  const windowStart = new Date()
  windowStart.setUTCMonth(windowStart.getUTCMonth() - windowMonths)
  windowStart.setUTCHours(0, 0, 0, 0)
  windowStart.setUTCDate(1)

  // Lifetime: all submitted attempts
  const allAttempts = await prisma.quizAttempt.findMany({
    where: {
      student_id: studentUserId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    orderBy: { submitted_at: "desc" },
    select: {
      id: true,
      status: true,
      score: true,
      submitted_at: true,
      started_at: true,
      quiz: {
        select: {
          id: true,
          title: true,
          subject: true,
          subject_group: true,
          total_marks: true,
        },
      },
      answers: {
        select: {
          is_correct: true,
          time_taken_secs: true,
        },
      },
    },
  })

  // ── Lifetime aggregates ──
  let totalPoints = 0
  let totalMaxPoints = 0
  let totalAnswered = 0
  let totalCorrect = 0
  let totalTimeSecsAcrossAnswers = 0
  let timeMeasuredAnswers = 0
  let autoSubmittedCount = 0

  for (const a of allAttempts) {
    totalPoints += a.score ?? 0
    totalMaxPoints += a.quiz.total_marks
    if (a.status === "AUTO_SUBMITTED") autoSubmittedCount++
    for (const ans of a.answers) {
      totalAnswered++
      if (ans.is_correct) totalCorrect++
      if (ans.time_taken_secs != null) {
        totalTimeSecsAcrossAnswers += ans.time_taken_secs
        timeMeasuredAnswers++
      }
    }
  }

  // ── Group by subject_group → subject ──
  type GroupBucket = {
    attempts: number
    pointsSum: number
    maxPointsSum: number
    answeredCount: number
    correctCount: number
    timeSecsSum: number
    timeMeasuredCount: number
    bySubject: Map<string, { attempts: number; pointsSum: number; maxPointsSum: number; answeredCount: number; correctCount: number }>
  }
  const groupBuckets = new Map<SubjectGroup, GroupBucket>()

  for (const a of allAttempts) {
    const g = a.quiz.subject_group as SubjectGroup
    let bucket = groupBuckets.get(g)
    if (!bucket) {
      bucket = {
        attempts: 0,
        pointsSum: 0,
        maxPointsSum: 0,
        answeredCount: 0,
        correctCount: 0,
        timeSecsSum: 0,
        timeMeasuredCount: 0,
        bySubject: new Map(),
      }
      groupBuckets.set(g, bucket)
    }
    bucket.attempts++
    bucket.pointsSum += a.score ?? 0
    bucket.maxPointsSum += a.quiz.total_marks
    for (const ans of a.answers) {
      bucket.answeredCount++
      if (ans.is_correct) bucket.correctCount++
      if (ans.time_taken_secs != null) {
        bucket.timeSecsSum += ans.time_taken_secs
        bucket.timeMeasuredCount++
      }
    }

    let subj = bucket.bySubject.get(a.quiz.subject)
    if (!subj) {
      subj = { attempts: 0, pointsSum: 0, maxPointsSum: 0, answeredCount: 0, correctCount: 0 }
      bucket.bySubject.set(a.quiz.subject, subj)
    }
    subj.attempts++
    subj.pointsSum += a.score ?? 0
    subj.maxPointsSum += a.quiz.total_marks
    for (const ans of a.answers) {
      subj.answeredCount++
      if (ans.is_correct) subj.correctCount++
    }
  }

  const bySubjectGroup: SubjectGroupStats[] = Array.from(groupBuckets.entries())
    .map(([sg, b]) => ({
      subjectGroup: sg,
      label: SUBJECT_GROUP_LABELS[sg],
      attempts: b.attempts,
      avgScorePct: pct(b.pointsSum, b.maxPointsSum),
      accuracyPct: pct(b.correctCount, b.answeredCount),
      avgTimePerQuestionSecs:
        b.timeMeasuredCount > 0
          ? Math.round((b.timeSecsSum / b.timeMeasuredCount) * 10) / 10
          : null,
      bySubject: Array.from(b.bySubject.entries())
        .map(([subject, s]) => ({
          subject,
          attempts: s.attempts,
          avgScorePct: pct(s.pointsSum, s.maxPointsSum),
          accuracyPct: pct(s.correctCount, s.answeredCount),
        }))
        .sort((x, y) => y.attempts - x.attempts),
    }))
    .sort((x, y) => y.attempts - x.attempts)

  // ── Monthly trend (within window) ──
  type MonthBucket = {
    attempts: number
    pointsSum: number
    maxPointsSum: number
    answeredCount: number
    correctCount: number
    bySubjectGroup: Map<SubjectGroup, { attempts: number; pointsSum: number; maxPointsSum: number }>
  }
  const monthBuckets = new Map<string, MonthBucket>()

  for (const a of allAttempts) {
    if (!a.submitted_at) continue
    if (a.submitted_at < windowStart) continue
    const key = monthKey(a.submitted_at)
    let mb = monthBuckets.get(key)
    if (!mb) {
      mb = {
        attempts: 0,
        pointsSum: 0,
        maxPointsSum: 0,
        answeredCount: 0,
        correctCount: 0,
        bySubjectGroup: new Map(),
      }
      monthBuckets.set(key, mb)
    }
    mb.attempts++
    mb.pointsSum += a.score ?? 0
    mb.maxPointsSum += a.quiz.total_marks
    for (const ans of a.answers) {
      mb.answeredCount++
      if (ans.is_correct) mb.correctCount++
    }
    const sg = a.quiz.subject_group as SubjectGroup
    let sgEntry = mb.bySubjectGroup.get(sg)
    if (!sgEntry) {
      sgEntry = { attempts: 0, pointsSum: 0, maxPointsSum: 0 }
      mb.bySubjectGroup.set(sg, sgEntry)
    }
    sgEntry.attempts++
    sgEntry.pointsSum += a.score ?? 0
    sgEntry.maxPointsSum += a.quiz.total_marks
  }

  const monthlyTrend: MonthlyTrendEntry[] = Array.from(monthBuckets.entries())
    .map(([month, mb]) => ({
      month,
      attempts: mb.attempts,
      avgScorePct: pct(mb.pointsSum, mb.maxPointsSum),
      accuracyPct: pct(mb.correctCount, mb.answeredCount),
      totalPoints: mb.pointsSum,
      bySubjectGroup: Array.from(mb.bySubjectGroup.entries()).map(([sg, e]) => ({
        subjectGroup: sg,
        attempts: e.attempts,
        avgScorePct: pct(e.pointsSum, e.maxPointsSum),
      })),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // ── Recent attempts (cap 20) ──
  const recentAttempts: RecentAttemptEntry[] = allAttempts.slice(0, 20).map((a) => {
    const answered = a.answers.length
    const correct = a.answers.filter((x) => x.is_correct).length
    const timeTakenSecs =
      a.submitted_at && a.started_at
        ? Math.round((a.submitted_at.getTime() - a.started_at.getTime()) / 1000)
        : null
    return {
      quizId: a.quiz.id,
      title: a.quiz.title,
      subjectGroup: a.quiz.subject_group as SubjectGroup,
      subject: a.quiz.subject,
      submittedAt: a.submitted_at,
      score: a.score ?? 0,
      totalMarks: a.quiz.total_marks,
      accuracyPct: pct(correct, answered),
      timeTakenSecs,
      isAutoSubmit: a.status === "AUTO_SUBMITTED",
    }
  })

  return {
    studentId: studentUserId,
    studentName: user.name,
    class: student?.class ?? null,
    section: student?.section ?? null,
    generatedAt: new Date(),
    windowMonths,
    lifetime: {
      totalAttempts: allAttempts.length,
      submittedAttempts: allAttempts.length,
      autoSubmittedCount,
      totalPoints,
      totalMaxPoints,
      avgScorePct: pct(totalPoints, totalMaxPoints),
      accuracyPct: pct(totalCorrect, totalAnswered),
      totalAnsweredQuestions: totalAnswered,
      totalCorrectAnswers: totalCorrect,
      totalTimeSecs: totalTimeSecsAcrossAnswers,
      avgTimePerQuestionSecs:
        timeMeasuredAnswers > 0
          ? Math.round((totalTimeSecsAcrossAnswers / timeMeasuredAnswers) * 10) / 10
          : null,
    },
    bySubjectGroup,
    monthlyTrend,
    recentAttempts,
  }
}
