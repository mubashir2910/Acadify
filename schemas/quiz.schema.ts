import { z } from "zod"

// ─── Subject Group ─────────────────────────────────────────────────────────

export const SUBJECT_GROUPS = [
  "SCIENCE",
  "MATHEMATICS",
  "SOCIAL_SCIENCE",
  "LANGUAGES",
  "COMPUTER_SCIENCE",
  "COMMERCE",
  "ARTS",
  "GENERAL_KNOWLEDGE",
] as const

export const subjectGroupSchema = z.enum(SUBJECT_GROUPS)
export type SubjectGroup = z.infer<typeof subjectGroupSchema>

export const SUBJECT_GROUP_LABELS: Record<SubjectGroup, string> = {
  SCIENCE: "Science",
  MATHEMATICS: "Mathematics",
  SOCIAL_SCIENCE: "Social Science",
  LANGUAGES: "Languages",
  COMPUTER_SCIENCE: "Computer Science",
  COMMERCE: "Commerce",
  ARTS: "Arts",
  GENERAL_KNOWLEDGE: "General Knowledge",
}

// ─── Option (MCQ) ──────────────────────────────────────────────────────────

export const optionSchema = z.object({
  text: z.string().min(1, "Option text is required").max(300, "Option text is too long"),
  isCorrect: z.boolean(),
  order: z.number().int().min(0),
})

// ─── Question ──────────────────────────────────────────────────────────────

const TIME_LIMIT_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const

export const questionSchema = z
  .object({
    text: z.string().min(1, "Question text is required").max(1000, "Question text is too long"),
    type: z.enum(["MCQ", "FILL_BLANK", "ONE_WORD"]),
    marks: z.number().int().min(1, "Marks must be at least 1"),
    timeLimitSecs: z.number().int().refine(
      (v) => TIME_LIMIT_OPTIONS.includes(v as typeof TIME_LIMIT_OPTIONS[number]),
      { message: "Time limit must be one of: 5, 10, 15, 20, 30, 45, 60 seconds" }
    ),
    order: z.number().int().min(0),
    correctAnswer: z.string().max(200, "Answer is too long").optional(),
    options: z.array(optionSchema).max(10, "Too many options").optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "MCQ") {
      if (!q.options || q.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ questions require at least 2 options",
          path: ["options"],
        })
        return
      }
      const correctCount = q.options.filter((o) => o.isCorrect).length
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ questions must have exactly 1 correct option",
          path: ["options"],
        })
      }
    } else {
      if (!q.correctAnswer || q.correctAnswer.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer is required for this question type",
          path: ["correctAnswer"],
        })
      }
    }
  })

// ─── Create Quiz ───────────────────────────────────────────────────────────

export const createQuizSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title is too long"),
    subjectGroup: subjectGroupSchema,
    subject: z.string().min(1, "Subject is required").max(100, "Subject is too long"),
    instructions: z.string().max(2000, "Instructions are too long").optional(),
    class: z.string().min(1, "Class is required").max(30, "Class is too long"),
    section: z.string().min(1, "Section is required").max(30, "Section is too long"),
    // totalPoints is predefined; questions must sum to this value
    totalPoints: z.number().int().min(1, "Total points must be at least 1"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    questions: z.array(questionSchema).min(1, "At least 1 question is required").max(100, "Too many questions"),
  })
  .refine(
    (d) => new Date(d.endTime) > new Date(d.startTime),
    { message: "End time must be after start time", path: ["endTime"] }
  )
  .superRefine((d, ctx) => {
    // Validate that the minimum duration is at least 1 minute
    const durationMs = new Date(d.endTime).getTime() - new Date(d.startTime).getTime()
    if (durationMs < 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contest duration must be at least 1 minute",
        path: ["endTime"],
      })
    }
    // Validate that question marks sum equals totalPoints
    const questionSum = d.questions.reduce((sum, q) => sum + q.marks, 0)
    if (questionSum !== d.totalPoints) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question marks (${questionSum}) must equal total points (${d.totalPoints})`,
        path: ["questions"],
      })
    }
  })

export type CreateQuizInput = z.infer<typeof createQuizSchema>

// ─── Update Quiz Status ────────────────────────────────────────────────────

export const updateQuizStatusSchema = z.object({
  // Only ACTIVE → CLOSED allowed now (no manual DRAFT → ACTIVE)
  status: z.enum(["CLOSED"]),
})

export type UpdateQuizStatusInput = z.infer<typeof updateQuizStatusSchema>

// ─── Save Answer ───────────────────────────────────────────────────────────

export const saveAnswerSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
  // Cap length: MCQ answers are option UUIDs (~36 chars) and FILL_BLANK/ONE_WORD
  // answers are short, so 1000 is generous while blocking oversized payloads.
  givenAnswer: z.string().max(1000, "Answer is too long").nullable(),
})

export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>

// ─── Leaderboard Query ─────────────────────────────────────────────────────

export const leaderboardQuerySchema = z.object({
  quizId: z.string().uuid("Invalid quiz ID"),
})

// ─── Arena Leaderboard Query ───────────────────────────────────────────────

export const arenaLeaderboardQuerySchema = z.object({
  type: z.enum(["monthly", "accumulated"]),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  class: z.string().optional(),
  section: z.string().optional(),
})

export type ArenaLeaderboardQuery = z.infer<typeof arenaLeaderboardQuerySchema>
