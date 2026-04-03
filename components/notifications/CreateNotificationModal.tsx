"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createNotificationSchema,
  CreateNotificationInput,
} from "@/schemas/notifications.schema"

interface ClassSection {
  class: string
  section: string
}

interface CreateNotificationModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateNotificationModal({
  open,
  onClose,
  onCreated,
}: CreateNotificationModalProps) {
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  const form = useForm<CreateNotificationInput>({
    resolver: zodResolver(createNotificationSchema),
    defaultValues: {
      title: "",
      message: "",
      target_audience: "ALL",
      target_class: null,
      target_section: null,
    },
  })

  const watchedClass = form.watch("target_class")

  // Fetch available class-sections when modal opens
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoadingClasses(true)
    fetch("/api/notifications/class-sections", { signal: controller.signal })
      .then((r) => r.json())
      .then((data: ClassSection[]) => setClassSections(data ?? []))
      .catch((err) => {
        if (err.name === "AbortError") return
        toast.error("Failed to load class list")
        setClassSections([])
      })
      .finally(() => setLoadingClasses(false))
    return () => controller.abort()
  }, [open])

  // Reset section when class changes
  useEffect(() => {
    form.setValue("target_section", null)
  }, [watchedClass, form])

  // Available sections for the selected class
  const availableSections = classSections
    .filter((cs) => cs.class === watchedClass)
    .map((cs) => cs.section)

  // Distinct classes
  const availableClasses = [...new Set(classSections.map((cs) => cs.class))]

  async function onSubmit(data: CreateNotificationInput) {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? "Failed to send notification")
        return
      }

      toast.success("Notification sent")
      onCreated()
      form.reset()
      onClose()
    } catch {
      toast.error("Failed to send notification")
    }
  }

  function handleClose() {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Notification</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Test on Friday" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your announcement here…"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Audience */}
            <FormField
              control={form.control}
              name="target_audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Send to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ALL">Everyone (Students &amp; Teachers)</SelectItem>
                      <SelectItem value="STUDENT">Students only</SelectItem>
                      <SelectItem value="TEACHER">Teachers only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Class */}
            <FormField
              control={form.control}
              name="target_class"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class (optional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__all__" ? null : v)}
                    value={field.value ?? "__all__"}
                    disabled={loadingClasses}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">All classes</SelectItem>
                      {availableClasses.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          Class {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Section — only shown if a class is selected */}
            {watchedClass && (
              <FormField
                control={form.control}
                name="target_section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section (optional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__all__" ? null : v)}
                      value={field.value ?? "__all__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All sections" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__all__">All sections</SelectItem>
                        {availableSections.map((sec) => (
                          <SelectItem key={sec} value={sec}>
                            Section {sec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
