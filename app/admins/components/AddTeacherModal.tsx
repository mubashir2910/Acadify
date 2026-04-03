"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Copy, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createTeacherSchema, type CreateTeacherInput, type CreateTeacherResult } from "@/schemas/teacher.schema"

interface AddTeacherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (result: CreateTeacherResult) => void
}

export default function AddTeacherModal({ open, onOpenChange, onSuccess }: AddTeacherModalProps) {
  const [phase, setPhase] = useState<"form" | "success">("form")
  const [successData, setSuccessData] = useState<CreateTeacherResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const form = useForm<CreateTeacherInput>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      name: "", email: "", phone: "", joining_date: "", date_of_birth: "",
    },
  })

  function handleOpenChange(value: boolean) {
    if (!value) {
      form.reset()
      setPhase("form")
      setSuccessData(null)
      setCopiedField(null)
    }
    onOpenChange(value)
  }

  async function onSubmit(values: CreateTeacherInput) {
    setSubmitting(true)
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? "Failed to create teacher")
        return
      }
      setSuccessData(data)
      setPhase("success")
      onSuccess(data)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {phase === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Teacher</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Name — full width */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="e.g. Priya Mehta" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email | Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input type="email" placeholder="e.g. priya@school.in" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Joining Date | Date of Birth */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="joining_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Joining Date <span className="text-muted-foreground text-xs">(optional, YYYY-MM-DD)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. 2024-06-01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth <span className="text-muted-foreground text-xs">(optional, DD-MM-YYYY)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. 15-03-1990" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Teacher"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Teacher Created Successfully
              </DialogTitle>
            </DialogHeader>
            {successData && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share these credentials with the teacher. The password will not be shown again.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Employee ID (Login Username)</p>
                      <p className="font-mono font-semibold text-slate-900">{successData.employeeId}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(successData.employeeId, "id")}
                    >
                      {copiedField === "id" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Temporary Password</p>
                      <p className="font-mono font-semibold text-slate-900">{successData.temporaryPassword}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(successData.temporaryPassword, "pass")}
                    >
                      {copiedField === "pass" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                  The teacher will be required to reset their password on first login.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
