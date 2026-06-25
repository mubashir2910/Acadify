"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, Lock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { getDashboardPath } from "@/lib/auth-redirect"
import { loginSchema, type LoginInput } from "@/schemas/auth.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false },
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)

    let result
    try {
      result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        // String — credentials values flow through as strings; parsed in authorize.
        remember: data.remember ? "true" : "false",
        redirect: false,
      })
    } catch {
      // signIn throws on a network/server failure — don't mislabel it as bad credentials.
      setServerError("Something went wrong. Please check your connection and try again.")
      return
    }

    if (!result?.ok || result.error) {
      const status = (result as { status?: number } | undefined)?.status
      if (status === 429) {
        // The login limiter kicked in (5 attempts / 15 min).
        setServerError("Too many attempts. Please wait a minute and try again.")
      } else if (!result) {
        // Undefined result = NextAuth hit a server error and redirected to
        // /api/auth/error instead of returning JSON — transient, not bad credentials.
        setServerError("Something went wrong. Please try again.")
      } else {
        setServerError("Invalid username or password.")
      }
      return
    }

    // Fetch the updated session to read role + mustResetPassword
    const res = await fetch("/api/auth/session")
    if (!res.ok) {
      setServerError("Sign-in succeeded but session could not be loaded. Please try again.")
      return
    }
    const session = await res.json()
    if (!session?.user) {
      setServerError("Sign-in succeeded but session could not be loaded. Please try again.")
      return
    }

    if (session.user.mustResetPassword) {
      router.push("/reset-password")
    } else {
      router.push(getDashboardPath(session.user.role ?? ""))
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Welcome back!</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Acadify account
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="username"
              type="text"
              placeholder="e.g. acadify_sa1"
              autoComplete="username"
              className="pl-10"
              {...register("username")}
            />
          </div>
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pl-10 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            {...register("remember")}
          />
          <Label
            htmlFor="remember"
            className="text-sm font-normal text-muted-foreground cursor-pointer"
          >
            Remember me for 30 days
          </Label>
        </div>

        {serverError && (
          <p className="text-sm text-destructive text-center">{serverError}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          loadingText="Signing in..."
        >
          Sign in
        </Button>
      </div>
    </form>
  )
}
