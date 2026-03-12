"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { contactFormSchema, type ContactFormInput } from "@/schemas/contact.schema"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { useState, useEffect } from "react"
import { Send, CheckCircle2 } from "lucide-react"

export function ContactUsForm() {
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  const form = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", message: "" },
  })

  // Redirect to landing page 2s after successful submission
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => router.push("/"), 1500)
    return () => clearTimeout(timer)
  }, [submitted, router])

  async function onSubmit(data: ContactFormInput) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        alert(error.message ?? "Failed to send message")
        return
      }

      form.reset()
      setSubmitted(true)
    } catch {
      alert("Something went wrong. Please try again.")
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-gray-900">Thank You!</h3>
        <p className="mt-2 text-muted-foreground">
          Your message has been sent. Redirecting to main page&hellip;
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind?"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FieldError message={fieldState.error?.message} />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full h-12 text-base font-semibold rounded-xl"
          size="lg"
        >
          {form.formState.isSubmitting ? (
            "Sending..."
          ) : (
            <>
              <Send className="mr-2 size-4" />
              Send Message
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
