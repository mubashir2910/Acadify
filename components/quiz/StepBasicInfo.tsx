"use client"

import { useEffect, useState } from "react"
import { UseFormReturn } from "react-hook-form"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldError } from "@/components/ui/field-error"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { CreateQuizInput } from "@/schemas/quiz.schema"

interface ClassSection {
  class: string
  section: string
}

interface StepBasicInfoProps {
  form: UseFormReturn<CreateQuizInput>
}

export function StepBasicInfo({ form }: StepBasicInfoProps) {
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [classLoadError, setClassLoadError] = useState(false)

  useEffect(() => {
    fetch("/api/quiz/classes")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load classes")
        return r.json()
      })
      .then((data: ClassSection[]) => setClassSections(data))
      .catch(() => {
        setClassSections([])
        setClassLoadError(true)
      })
      .finally(() => setLoadingClasses(false))
  }, [])

  const { control, watch, setValue } = form
  const selectedClass = watch("class")
  const startTime = watch("startTime")
  const endTime = watch("endTime")

  const availableSections = classSections
    .filter((cs) => cs.class === selectedClass)
    .map((cs) => cs.section)

  const uniqueClasses = [...new Set(classSections.map((cs) => cs.class))]

  // Compute and display duration from start/end times
  const computedDuration =
    startTime && endTime
      ? Math.max(0, Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000))
      : null

  return (
    <div className="space-y-5">
      {/* Title */}
      <FormField
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Contest Title <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="e.g. Chapter 3 — Photosynthesis Challenge" {...field} />
            </FormControl>
            <FieldError message={fieldState.error?.message} />
          </FormItem>
        )}
      />

      {/* Subject */}
      <FormField
        control={control}
        name="subject"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Subject <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="e.g. Biology" {...field} />
            </FormControl>
            <FieldError message={fieldState.error?.message} />
          </FormItem>
        )}
      />

      {/* Class + Section */}
      {classLoadError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          Failed to load class list. Please refresh the page or contact your administrator.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="class"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Class <span className="text-red-500">*</span></FormLabel>
              <Select
                disabled={loadingClasses}
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v)
                  setValue("section", "")
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingClasses ? "Loading…" : "Select class"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {uniqueClasses.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="section"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Section <span className="text-red-500">*</span></FormLabel>
              <Select
                disabled={!selectedClass}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableSections.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />
      </div>

      {/* Total Points */}
      <FormField
        control={control}
        name="totalPoints"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Total Points <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 100"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Allocate these points across questions in the next step.
            </p>
            <FieldError message={fieldState.error?.message} />
          </FormItem>
        )}
      />

      {/* Start / End Time */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="startTime"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Start Time <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="endTime"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>End Time <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />
      </div>

      {/* Duration auto-display */}
      {computedDuration !== null && (
        <p className="text-xs text-muted-foreground bg-accent border border-blue-100 rounded-lg px-3 py-2">
          Contest duration: <strong>{computedDuration} minute{computedDuration !== 1 ? "s" : ""}</strong>
          {computedDuration < 1 && (
            <span className="text-red-500 ml-1">— End time must be after start time</span>
          )}
        </p>
      )}

      {/* Instructions */}
      <FormField
        control={control}
        name="instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Instructions <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g. Read all questions carefully. No negative marking."
                className="resize-none"
                rows={3}
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Shuffle Options */}
      <div className="flex gap-6 pt-1">
        <FormField
          control={control}
          name="shuffleQuestions"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch
                id="shuffleQ"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="shuffleQ" className="text-sm cursor-pointer">
                Shuffle question order per student
              </Label>
            </div>
          )}
        />

        <FormField
          control={control}
          name="shuffleOptions"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch
                id="shuffleO"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="shuffleO" className="text-sm cursor-pointer">
                Shuffle MCQ option order
              </Label>
            </div>
          )}
        />
      </div>
    </div>
  )
}
