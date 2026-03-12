"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface ComingSoonProps {
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "School Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
}

export function ComingSoon({ role }: ComingSoonProps) {
  const { data: session } = useSession()
  const label = ROLE_LABELS[role] ?? role

  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1>Welcome {session?.user?.name}</h1>
        <span className="text-5xl">🚧</span>
        <h1 className="text-3xl font-bold">Coming Soon</h1>
        <p className="text-muted-foreground max-w-sm">
          The <strong>{label}</strong> dashboard is under construction. Check back soon!
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </Button>
    </div>
  )
}
