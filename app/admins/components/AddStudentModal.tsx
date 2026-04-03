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
import { createStudentSchema, type CreateStudentInput, type CreateStudentResult } from "@/schemas/student.schema"

interface AddStudentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (result: CreateStudentResult) => void
}

export default function AddStudentModal({ open, onOpenChange, onSuccess }: AddStudentModalProps) {
  const [phase, setPhase] = useState<"form" | "success">("form")
  const [successData, setSuccessData] = useState<CreateStudentResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      name: "", class: "", section: "", roll_no: "",
      guardian_name: "", guardian_phone: "",
      email: "", phone: "", admission_no: "", date_of_birth: "",
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

  async function onSubmit(values: CreateStudentInput) {
    setSubmitting(true)
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? "Failed to create student")
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {phase === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
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
                      <FormControl><Input placeholder="e.g. Arjun Sharma" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Class | Section */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. 10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. A" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Roll No | Guardian Name */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="roll_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roll Number <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. 21" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Rajesh Sharma" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Guardian Phone | Admission No */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="guardian_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Phone <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admission_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission No <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. ADM2024001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email | Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl><Input type="email" placeholder="e.g. student@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Date of Birth — full width */}
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth <span className="text-muted-foreground text-xs">(optional, DD-MM-YYYY)</span></FormLabel>
                      <FormControl><Input placeholder="e.g. 15-08-2010" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Student"}
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
                Student Created Successfully
              </DialogTitle>
            </DialogHeader>
            {successData && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share these credentials with the student. The password will not be shown again.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Student ID (Login Username)</p>
                      <p className="font-mono font-semibold text-slate-900">{successData.username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(successData.username, "id")}
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
                  The student will be required to reset their password on first login.
                </p>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Class:</span> {successData.class} — {successData.section} &nbsp;|&nbsp;
                  <span className="font-medium">Roll No:</span> {successData.roll_no}
                </div>
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
