"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  adminProfileUpdateSchema,
  type AdminProfileUpdateInput,
  BLOOD_GROUPS,
} from "@/schemas/profile.schema"
import { Pencil, X, Lock, Loader2 } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { FieldError } from "@/components/ui/field-error"
import { ProfilePictureUploader } from "@/components/forms/profile-picture-uploader"

interface AdminProfile {
  id: string
  name: string
  username: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  blood_group: string | null
  profile_picture: string | null
  schoolUsers: {
    school: { schoolName: string; schoolCode: string }
    joined_at: string
  }[]
}

function formatDate(val: string | null) {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function AdminProfileView() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState("")

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile")
      if (res.ok) {
        setProfile(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const schoolUser = profile?.schoolUsers?.[0]

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdminProfileUpdateInput>({
    resolver: zodResolver(adminProfileUpdateSchema),
  })

  function startEdit() {
    if (!profile) return
    reset({
      date_of_birth: profile.date_of_birth
        ? new Date(profile.date_of_birth).toISOString().split("T")[0]
        : "",
      phone: profile.phone ?? "",
      email: profile.email ?? "",
      blood_group: (profile.blood_group as AdminProfileUpdateInput["blood_group"]) ?? undefined,
      profile_picture: profile.profile_picture ?? undefined,
    })
    setEditing(true)
    setServerError("")
  }

  async function onSubmit(data: AdminProfileUpdateInput) {
    setSaving(true)
    setServerError("")

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        setServerError(err.message ?? "Failed to update profile")
        return
      }

      setEditing(false)
      await fetchProfile()
    } catch {
      setServerError("Network error — please try again")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!profile) {
    return <p className="text-muted-foreground">Profile not found.</p>
  }

  const bloodGroup = watch("blood_group")

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-5">
          {editing ? (
            <ProfilePictureUploader
              currentUrl={profile.profile_picture}
              name={profile.name}
              onUpload={(url) => setValue("profile_picture", url)}
            />
          ) : (
            <div className="h-20 w-20 rounded-full overflow-hidden bg-[#1e2a4a] flex items-center justify-center text-white text-xl font-semibold shrink-0">
              {profile.profile_picture ? (
                <img
                  src={profile.profile_picture}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              )}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {profile.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {profile.username}
            </p>
            <p className="text-sm text-muted-foreground">
              {schoolUser?.school.schoolName ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-900">
            Personal Information
          </h3>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select
                  value={bloodGroup ?? ""}
                  onValueChange={(val) =>
                    setValue(
                      "blood_group",
                      val as AdminProfileUpdateInput["blood_group"],
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <InfoField label="Date of Birth" value={formatDate(profile.date_of_birth)} />
            <InfoField label="Phone" value={profile.phone ?? "—"} />
            <InfoField label="Email" value={profile.email ?? "—"} />
            <InfoField label="Blood Group" value={profile.blood_group ?? "—"} />
          </div>
        )}
      </div>

      {/* Account Information (read-only) */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <h3 className="text-base font-semibold text-slate-900">
            Account Information
          </h3>
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <InfoField label="Username" value={profile.username} />
          <InfoField label="School" value={schoolUser?.school.schoolName ?? "—"} />
          <InfoField label="Joined Date" value={formatDate(schoolUser?.joined_at ?? null)} />
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  )
}
