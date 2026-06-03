"use client"

import { useFieldArray, UseFormReturn } from "react-hook-form"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form"
import { FieldError } from "@/components/ui/field-error"
import { Badge } from "@/components/ui/badge"
import type { CreateQuizInput } from "@/schemas/quiz.schema"

interface QuestionEditorProps {
  form: UseFormReturn<CreateQuizInput>
  index: number
  onRemove: () => void
  canRemove: boolean
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice",
  FILL_BLANK: "Fill in the Blank",
  ONE_WORD: "One Word Answer",
}

export function QuestionEditor({ form, index, onRemove, canRemove }: QuestionEditorProps) {
  const { control, watch } = form
  const questionType = watch(`questions.${index}.type`)

  const { fields: options, append: addOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${index}.options` as `questions.${number}.options`,
  })

  return (
    <div className="border border-border rounded-xl p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-muted-foreground">
          Q{index + 1}
        </Badge>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Question Text */}
      <FormField
        control={control}
        name={`questions.${index}.text`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-sm">Question</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter your question here…"
                className="resize-none"
                rows={2}
                {...field}
              />
            </FormControl>
            <FieldError message={fieldState.error?.message} />
          </FormItem>
        )}
      />

      {/* Type + Points + Time Limit */}
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={control}
          name={`questions.${index}.type`}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-sm">Type</FormLabel>
              <Select
                value={field.value}
                onValueChange={(newType) => {
                  field.onChange(newType)
                  if (newType !== "MCQ") {
                    // Clear options — hidden empty options cause silent validation failures
                    form.setValue(
                      `questions.${index}.options` as `questions.${number}.options`,
                      []
                    )
                  } else {
                    // Switching back to MCQ: restore default options if none exist
                    const existing = form.getValues(
                      `questions.${index}.options` as `questions.${number}.options`
                    )
                    if (!existing || existing.length < 2) {
                      form.setValue(
                        `questions.${index}.options` as `questions.${number}.options`,
                        [
                          { text: "", isCorrect: true, order: 0 },
                          { text: "", isCorrect: false, order: 1 },
                        ]
                      )
                    }
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`questions.${index}.marks`}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-sm">Points</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`questions.${index}.timeLimitSecs`}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-sm">Time Limit</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(parseInt(v))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[5, 10, 15, 20, 30, 45, 60].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}s</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />
      </div>

      {/* MCQ Options */}
      {questionType === "MCQ" && (
        <div className="space-y-2">
          <FormLabel className="text-sm">Options <span className="text-red-500">*</span></FormLabel>
          {options.map((opt, oIdx) => {
            const isCorrect = form.watch(`questions.${index}.options.${oIdx}.isCorrect`)
            return (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Deselect all then mark this one correct
                    options.forEach((_, i) => {
                      form.setValue(`questions.${index}.options.${i}.isCorrect`, i === oIdx)
                    })
                  }}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    isCorrect
                      ? "border-green-500 bg-green-500"
                      : "border-border hover:border-slate-400"
                  }`}
                  title="Mark as correct"
                />
                <FormField
                  control={control}
                  name={`questions.${index}.options.${oIdx}.text`}
                  render={({ field, fieldState }) => (
                    <div className="flex-1 flex flex-col gap-0.5">
                      <Input
                        placeholder={`Option ${oIdx + 1}`}
                        {...field}
                      />
                      <FieldError message={fieldState.error?.message} />
                    </div>
                  )}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(oIdx)}
                    className="text-muted-foreground hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )
          })}
          <FieldError
            message={
              (form.formState.errors.questions?.[index]?.options as { message?: string } | undefined)
                ?.message
            }
          />
          {options.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addOption({ text: "", isCorrect: false, order: options.length })}
              className="mt-1"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Click the circle next to the correct answer.</p>
        </div>
      )}

      {/* Correct Answer for non-MCQ */}
      {questionType !== "MCQ" && (
        <FormField
          control={control}
          name={`questions.${index}.correctAnswer`}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-sm">
                Correct Answer <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={
                    questionType === "FILL_BLANK"
                      ? "e.g. Chlorophyll"
                      : "e.g. Mitosis"
                  }
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Case-insensitive match</p>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
