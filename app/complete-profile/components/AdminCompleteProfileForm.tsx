"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  adminProfileCompleteSchema,
  type AdminProfileCompleteInput,
  BLOOD_GROUPS,
} from "@/schemas/profile.schema"
import { getDashboardPath } from "@/lib/auth-redirect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldError } from "@/components/ui/field-error"
import { ProfilePictureUploader } from "@/components/forms/profile-picture-uploader"

interface Props {
  userName: string
}

export function AdminCompleteProfileForm({ userName }: Props) {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<AdminProfileCompleteInput>({
    resolver: zodResolver(adminProfileCompleteSchema),
  })

  async function onSubmit(data: AdminProfileCompleteInput) {
    setServerError("")

    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        setServerError(err.message ?? "Failed to save profile")
        return
      }

      await updateSession({ isProfileComplete: true })
      router.push(getDashboardPath(session?.user?.role ?? ""))
    } catch {
      setServerError("Network error — please try again")
    }
  }

  const bloodGroup = watch("blood_group")

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Profile Picture */}
        <ProfilePictureUploader
          name={userName}
          onUpload={(url) => setValue("profile_picture", url)}
        />

        {/* Required Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Required Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register("date_of_birth")}
              />
              <FieldError message={errors.date_of_birth?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Phone number"
                {...register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                {...register("email")}
              />
              <FieldError message={errors.email?.message} />
            </div>
          </div>
        </div>

        {/* Optional Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            Optional Information
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            You can fill these now or update later from your profile page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <Select
                value={bloodGroup ?? ""}
                onValueChange={(val) =>
                  setValue("blood_group", val as AdminProfileCompleteInput["blood_group"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive text-center">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Complete Profile"}
        </Button>
      </form>
    </div>
  )
}
