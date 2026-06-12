"use client"

import { useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { createQuizSchema, SUBJECT_GROUP_LABELS, type CreateQuizInput, type SubjectGroup } from "@/schemas/quiz.schema"
import { StepBasicInfo } from "./StepBasicInfo"
import { StepQuestions } from "./StepQuestions"
import { StepReview } from "./StepReview"
import { ConfirmContestModal } from "./ConfirmContestModal"
import { ChevronLeft, ChevronRight, Send } from "lucide-react"

const STEPS = ["Basic Info", "Questions", "Review"]

interface CreateQuizWizardProps {
  /** Where to redirect after successful creation */
  successRedirect: string
}

export function CreateQuizWizard({ successRedirect }: CreateQuizWizardProps) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

  const form = useForm<CreateQuizInput>({
    resolver: zodResolver(createQuizSchema),
    defaultValues: {
      title: "",
      subjectGroup: "" as unknown as SubjectGroup,
      subject: "",
      instructions: "",
      class: "",
      section: "",
      totalPoints: 10,
      startTime: "",
      endTime: "",
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: [
        {
          text: "",
          type: "MCQ",
          marks: 1,
          timeLimitSecs: 30,
          order: 0,
          correctAnswer: "",
          options: [
            { text: "", isCorrect: true, order: 0 },
            { text: "", isCorrect: false, order: 1 },
          ],
        },
      ],
    },
    mode: "onTouched",
  })

  // Fields validated per step
  const STEP_FIELDS: (keyof CreateQuizInput)[][] = [
    ["title", "subjectGroup", "subject", "class", "section", "totalPoints", "startTime", "endTime"],
    ["questions"],
    [],
  ]

  async function handleNext() {
    const fields = STEP_FIELDS[step]
    const valid = await form.trigger(fields)
    if (valid) setStep((s) => s + 1)
  }

  // Called from StepQuestions "Create Contest" button
  async function handleCreateContestClick() {
    const values = form.getValues()
    const totalPoints = values.totalPoints || 0
    const allocatedPoints = values.questions.reduce((s, q) => s + (q.marks || 0), 0)
    const remaining = totalPoints - allocatedPoints

    if (remaining !== 0) {
      toast.error(
        remaining > 0
          ? `${remaining} point${remaining !== 1 ? "s" : ""} still remaining to allocate`
          : `${Math.abs(remaining)} point${Math.abs(remaining) !== 1 ? "s" : ""} over the total limit`
      )
      return
    }

    // Trigger question-level validation before showing modal
    const valid = await form.trigger(["questions"])
    if (!valid) {
      toast.error("Please fix the errors in your questions before proceeding")
      return
    }

    setConfirmOpen(true)
  }

  const handleSubmit: SubmitHandler<CreateQuizInput> = async (data) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? json.message ?? "Failed to create contest")
        return
      }
      toast.success("Contest created! It will go live at the scheduled time.")
      router.push(successRedirect)
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setSubmitting(false)
    }
  }

  // Compute summary for the confirm modal
  const values = form.getValues()
  const durationMins =
    values.startTime && values.endTime
      ? Math.floor((new Date(values.endTime).getTime() - new Date(values.startTime).getTime()) / 60_000)
      : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors ${
                i < step
                  ? "bg-green-500 text-white"
                  : i === step
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === step ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-border mx-1 w-8" />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="min-h-[400px]">
            {step === 0 && <StepBasicInfo form={form} />}
            {step === 1 && (
              <StepQuestions form={form} onCreateQuiz={handleCreateContestClick} />
            )}
            {step === 2 && <StepReview form={form} />}
          </div>

          {/* Navigation — hidden on step 1 since StepQuestions has its own bottom actions */}
          {step !== 1 && (
            <div className="flex justify-between pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Create Contest
                </Button>
              )}
            </div>
          )}

          {/* Back button on step 1 */}
          {step === 1 && (
            <div className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(0)}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Basic Info
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Confirmation Modal */}
      <ConfirmContestModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={form.handleSubmit(handleSubmit, (errors) => {
          console.error("Contest form validation failed:", errors)
          toast.error("Please fix all errors before creating the contest")
        })}
        submitting={submitting}
        summary={{
          title: values.title,
          subject: values.subject,
          subjectGroupLabel: values.subjectGroup
            ? SUBJECT_GROUP_LABELS[values.subjectGroup]
            : "",
          questions: values.questions.length,
          totalPoints: values.totalPoints,
          durationMins,
          startTime: values.startTime,
          endTime: values.endTime,
          class: values.class,
          section: values.section,
        }}
      />
    </div>
  )
}
