import Image from "next/image"
import Link from "next/link"
import { Signpost, Home, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/auth"
import { getDashboardPath } from "@/lib/auth-redirect"

export default async function NotFound() {
  const session = await auth()
  // Logged-in users go to their role dashboard; unauthenticated land on /login
  const homeHref = session?.user?.role
    ? getDashboardPath(session.user.role)
    : "/login"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 sm:p-8">
      <Image
        src="/assets/error/404.png"
        alt="Page not found illustration"
        width={1536}
        height={1024}
        priority
        className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto"
      />

      <div className="w-full max-w-3xl rounded-2xl border bg-card px-5 py-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <Signpost className="h-10 w-10 md:h-12 md:w-12 text-primary shrink-0" />
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-semibold text-foreground text-base md:text-lg">
            Let&apos;s get you back on track.
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose an option below to continue.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button asChild className="w-full sm:w-auto">
            <Link href={homeHref}>
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/">
              <Send className="h-4 w-4 mr-2" />
              Explore Acadify
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
