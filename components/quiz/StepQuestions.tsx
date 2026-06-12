"use client"

import { useFieldArray, UseFormReturn } from "react-hook-form"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuestionEditor } from "./QuestionEditor"
import type { CreateQuizInput } from "@/schemas/quiz.schema"

interface StepQuestionsProps {
  form: UseFormReturn<CreateQuizInput>
  /** Called when the user wants to proceed to confirmation (all points allocated) */
  onCreateQuiz: () => void
}

function makeDefaultQuestion(order: number) {
  return {
    text: "",
    type: "MCQ" as const,
    marks: 1,
    timeLimitSecs: 30,
    order,
    correctAnswer: "",
    options: [
      { text: "", isCorrect: true, order: 0 },
      { text: "", isCorrect: false, order: 1 },
    ],
  }
}

export function StepQuestions({ form, onCreateQuiz }: StepQuestionsProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  })

  const totalPoints = form.watch("totalPoints") || 0
  const questions = form.watch("questions")
  const allocatedPoints = questions.reduce((s, q) => s + (q.marks || 0), 0)
  const remainingPoints = totalPoints - allocatedPoints
  const allAllocated = remainingPoints === 0

  return (
    <div className="space-y-4">
      {/* Header: question count + remaining points */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fields.length} question{fields.length !== 1 ? "s" : ""}
        </p>
        <Badge
          variant="outline"
          className={
            allAllocated
              ? "border-green-500 text-green-700 dark:text-green-400 bg-green-500/10"
              : remainingPoints < 0
              ? "border-red-500 text-red-700 dark:text-red-400 bg-red-500/10"
              : "border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10"
          }
        >
          {allAllocated
            ? `All ${totalPoints} points allocated`
            : remainingPoints < 0
            ? `${Math.abs(remainingPoints)} points over limit`
            : `Remaining: ${remainingPoints} pts`}
        </Badge>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
          No questions yet. Click &quot;Next Question&quot; below to start.
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <QuestionEditor
            key={field.id}
            form={form}
            index={index}
            onRemove={() => remove(index)}
            canRemove={fields.length > 1}
          />
        ))}
      </div>

      {/* Bottom actions: Create Quiz (center) + Next Question (right) */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={allAllocated ? "default" : "outline"}
            disabled={!allAllocated && remainingPoints >= 0 ? false : !allAllocated}
            onClick={onCreateQuiz}
            className={allAllocated ? "bg-green-600 hover:bg-green-700" : ""}
          >
            Create Contest
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => append(makeDefaultQuestion(fields.length))}
          >
            <Plus className="h-4 w-4 mr-1" /> Next Question
          </Button>
        </div>
      </div>
    </div>
  )
}
