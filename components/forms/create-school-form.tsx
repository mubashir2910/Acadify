"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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

interface CreateSchoolFormProps {
  onSuccess: () => void
}

const localFormSchema = z.object({
  schoolName: z
    .string()
    .min(2, "School Name must be atleast 2 character long")
    .max(50, "School Name must not exceed 50 character long"),
  schoolCode: z
    .string()
    .min(2, "School Code must be atleast 2 character long")
    .max(5, "School Code must not exceed 5 character long"),
  motto: z.string().max(200).optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Brand color must be a 6-digit hex like #16A34A"),
  paymentMode: z.enum(["FULL_MANUAL", "FULL_ONLINE", "HYBRID"]),
  currency: z.string().min(3).max(8),
  defaultLateFeeEnabled: z.boolean(),
  defaultLateFeeType: z.enum(["FIXED", "PERCENT"]),
  defaultLateFeeValue: z.string(),
  defaultLateFeeGraceDayOfMonth: z.string(),
  defaultLateFeeFrequency: z.enum(["MONTHLY", "DAILY", "ONE_TIME"]),
})

type LocalFormValues = z.infer<typeof localFormSchema>

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function CreateSchoolForm({ onSuccess }: CreateSchoolFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<LocalFormValues>({
    resolver: zodResolver(localFormSchema),
    defaultValues: {
      schoolName: "",
      schoolCode: "",
      motto: "",
      brandColor: "#000000",
      paymentMode: "FULL_MANUAL",
      currency: "INR",
      defaultLateFeeEnabled: false,
      defaultLateFeeType: "FIXED",
      defaultLateFeeValue: "",
      defaultLateFeeGraceDayOfMonth: "",
      defaultLateFeeFrequency: "MONTHLY",
    },
  })

  const watchedMode = form.watch("paymentMode")
  const lateFeeOn = form.watch("defaultLateFeeEnabled")
  const brandColor = form.watch("brandColor")
  const showGatewayInfo = watchedMode === "FULL_ONLINE"

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setServerError(null)
    if (!file) {
      setLogoFile(null)
      setLogoPreview(null)
      return
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setServerError("Logo must be JPEG, PNG, or WebP")
      e.target.value = ""
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setServerError("Logo must be under 2MB")
      e.target.value = ""
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(typeof ev.target?.result === "string" ? ev.target.result : null)
    reader.readAsDataURL(file)
  }

  async function onSubmit(values: LocalFormValues) {
    setServerError(null)

    const payload: Record<string, unknown> = {
      schoolName: values.schoolName,
      schoolCode: values.schoolCode,
      motto: values.motto?.trim() || null,
      brandColor: values.brandColor,
      paymentConfig: {
        paymentMode: values.paymentMode,
        currency: values.currency || "INR",
        defaultLateFeeEnabled: values.defaultLateFeeEnabled,
        defaultLateFeeType: values.defaultLateFeeEnabled
          ? values.defaultLateFeeType
          : null,
        defaultLateFeeValue:
          values.defaultLateFeeEnabled && values.defaultLateFeeValue
            ? Number(values.defaultLateFeeValue)
            : null,
        defaultLateFeeGraceDayOfMonth:
          values.defaultLateFeeEnabled && values.defaultLateFeeGraceDayOfMonth
            ? Number(values.defaultLateFeeGraceDayOfMonth)
            : null,
        defaultLateFeeFrequency: values.defaultLateFeeEnabled
          ? values.defaultLateFeeFrequency
          : null,
      },
    }

    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      setServerError(error.message ?? "Failed to create school")
      return
    }

    // If a logo was selected, upload it and PATCH the branding URL.
    // Surfaced as a soft warning if the logo upload itself fails — the school is already created.
    if (logoFile) {
      try {
        const fd = new FormData()
        fd.append("file", logoFile)
        fd.append("schoolCode", values.schoolCode)
        const upload = await fetch("/api/upload/school-logo", { method: "POST", body: fd })
        const uploadJson = await upload.json().catch(() => ({}))
        if (upload.ok && uploadJson?.url) {
          await fetch(`/api/schools/${values.schoolCode}/branding`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logoUrl: uploadJson.url }),
          })
        }
      } catch (err) {
        console.warn("Logo upload failed, school created without logo", err)
      }
    }

    form.reset()
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h4 className="text-sm font-semibold">Branding (optional)</h4>

          <div className="flex items-center gap-4">
            <div
              className="size-16 rounded-md border border-dashed border-border bg-background flex items-center justify-center overflow-hidden"
              style={{ borderColor: brandColor }}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo preview" className="size-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <FormLabel className="block mb-2">School Logo</FormLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                className="text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm hover:file:bg-muted/80"
              />
              <p className="text-xs text-muted-foreground mt-1">PNG/JPG/WebP, max 2MB.</p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="motto"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Motto (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="A short tagline shown on receipts and report cards"
                    maxLength={200}
                    {...field}
                  />
                </FormControl>
                <FieldError message={fieldState.error?.message} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brandColor"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Brand Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="h-10 w-14 rounded border border-border bg-background p-1"
                    />
                    <Input
                      placeholder="#000000"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Used on receipts, report cards, and certificates. Defaults to black.
                </p>
                <FieldError message={fieldState.error?.message} />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h4 className="text-sm font-semibold">Payment configuration</h4>

          <FormField
            control={form.control}
            name="paymentMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Mode</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...field}
                  >
                    <option value="FULL_MANUAL">Full Manual (cash/offline only)</option>
                    <option value="HYBRID">
                      Hybrid (parents upload proof, admin verifies)
                    </option>
                    <option value="FULL_ONLINE">
                      Full Online (payment gateway — coming soon)
                    </option>
                  </select>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Bank accounts, UPI IDs, and QR codes are added separately from the admin Payment Settings page after creation.
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Input placeholder="INR" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {showGatewayInfo && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-200 rounded p-2">
              Online payment gateway integration is coming soon. You can configure
              keys later from the school settings.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <FormField
            control={form.control}
            name="defaultLateFeeEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  Enable default late fee for the school
                </FormLabel>
              </FormItem>
            )}
          />

          {lateFeeOn && (
            <div className="space-y-3 pl-7">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="defaultLateFeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...field}
                        >
                          <option value="FIXED">Fixed amount</option>
                          <option value="PERCENT">Percent of outstanding</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultLateFeeValue"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="50"
                          {...field}
                        />
                      </FormControl>
                      <FieldError message={fieldState.error?.message} />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="defaultLateFeeGraceDayOfMonth"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Grace day of month</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="10"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Late fee starts accruing after this day each month.
                      </p>
                      <FieldError message={fieldState.error?.message} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultLateFeeFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accrual</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...field}
                        >
                          <option value="MONTHLY">Monthly (recommended)</option>
                          <option value="DAILY">Daily</option>
                          <option value="ONE_TIME">One-time</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          loading={form.formState.isSubmitting}
          loadingText="Creating..."
        >
          Create School
        </Button>
      </form>
    </Form>
  )
}
