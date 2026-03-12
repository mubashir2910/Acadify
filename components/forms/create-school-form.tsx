"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSchoolSchema, type CreateSchoolInput } from "@/schemas/school.schema"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"

interface CreateSchoolFormProps {
  onSuccess: () => void
}

export function CreateSchoolForm({ onSuccess }: CreateSchoolFormProps) {
  const form = useForm<CreateSchoolInput>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: { schoolName: "", schoolCode: "" },
  })

  async function onSubmit(data: CreateSchoolInput) {
    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      alert(error.message ?? "Failed to create school")
      return
    }

    alert("School created")
    form.reset()
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="schoolName"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>School Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Sunrise Academy" {...field} />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schoolCode"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>School Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g. SRA" {...field} />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create School"}
        </Button>
      </form>
    </Form>
  )
}
