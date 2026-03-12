"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getDashboardPath } from "@/lib/auth-redirect"
import { loginSchema, type LoginInput } from "@/schemas/auth.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)

    const result = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setServerError("Invalid username or password.")
      return
    }

    // Fetch the updated session to read role + mustResetPassword
    const res = await fetch("/api/auth/session")
    const session = await res.json()

    if (session?.user?.mustResetPassword) {
      router.push("/reset-password")
    } else {
      router.push(getDashboardPath(session?.user?.role ?? ""))
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Acadify account
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="e.g. acadify_sa1"
            autoComplete="username"
            {...register("username")}
          />
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-destructive text-center">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </div>
    </form>
  )
}
