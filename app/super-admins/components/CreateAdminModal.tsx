"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAdminSchema, type CreateAdminInput } from "@/schemas/admin.schema"
import type { School } from "./SchoolCard"

interface CreateAdminModalProps {
  school: School
  onClose: () => void
}

type View = "form" | "success"

export default function CreateAdminModal({ school, onClose }: CreateAdminModalProps) {
  const [view, setView] = useState<View>("form")
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string
    tempPassword: string
  } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateAdminInput>({
    resolver: zodResolver(createAdminSchema),
  })

  async function onSubmit(data: CreateAdminInput) {
    setServerError(null)

    const res = await fetch(`/api/schools/${school.schoolCode}/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setServerError(json.message ?? "Failed to create admin")
      return
    }

    setCreatedCredentials({ username: json.username, tempPassword: json.tempPassword })
    setView("success")
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {view === "form" ? `Create Admin — ${school.schoolName}` : "Admin Created"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form view */}
        {view === "form" && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. John Smith"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="e.g. smith_admin"
                autoComplete="off"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and underscores only. This will be the admin&apos;s login username.
              </p>
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        )}

        {/* Success view */}
        {view === "success" && createdCredentials && (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 border border-green-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-green-800">
                Admin account created successfully!
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Username</span>
                  <code className="font-mono bg-white border border-green-200 rounded px-2 py-0.5 text-green-900 select-all">
                    {createdCredentials.username}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Temp Password</span>
                  <code className="font-mono bg-white border border-green-200 rounded px-2 py-0.5 text-green-900 select-all">
                    {createdCredentials.tempPassword}
                  </code>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share these credentials with the admin. They will be prompted to reset their
              password on first login.
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
