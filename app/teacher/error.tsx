"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Signpost, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TeacherError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[teacher]", error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 sm:p-8">
      <Image
        src="/assets/error/500.png"
        alt="Server error illustration"
        width={1536}
        height={1024}
        priority
        className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto"
      />

      <div className="w-full max-w-3xl rounded-2xl border bg-card px-5 py-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <Signpost className="h-10 w-10 md:h-12 md:w-12 text-primary shrink-0" />
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-semibold text-foreground text-base md:text-lg">
            Let&apos;s try that again.
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose an option below to continue.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
