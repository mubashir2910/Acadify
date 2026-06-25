import NextAuth from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authConfig } from "./auth.config"
import { getDashboardPath } from "@/lib/auth-redirect"
import { authLimiter, publicLimiter, expensiveReadLimiter, getIp, checkRateLimit } from "@/lib/rate-limit"

// Lightweight edge-compatible auth — only verifies the JWT, no bcrypt/prisma imported.
const { auth } = NextAuth(authConfig)

// Routes that require a specific role
const ROLE_ROUTES: Record<string, string> = {
  "/super-admins": "SUPER_ADMIN",
  "/admins": "ADMIN",
  "/teacher": "TEACHER",
  "/student": "STUDENT",
}

/**
 * Rate limiting guard for the two paths excluded from the NextAuth matcher:
 *   - POST /api/auth/callback/credentials  (login)
 *   - POST /api/contact                    (public contact form)
 *
 * GET /api/auth/* (NextAuth session polling, token refresh) is intentionally
 * NOT rate-limited — blocking it would break the 15-min JWT refresh cycle.
 */
async function rateLimitGuard(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl

  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip = getIp(req)
    return checkRateLimit(authLimiter, `auth:${ip}`)
  }

  if (pathname === "/api/contact" && req.method === "POST") {
    const ip = getIp(req)
    return checkRateLimit(publicLimiter, `contact:${ip}`)
  }

  // Public Digital ID cards: IP-rate-limit to deter scraping/enumeration.
  // (Tokens are unguessable UUIDs; this is defence-in-depth, hence the generous limit.)
  if (pathname.startsWith("/id/") && req.method === "GET") {
    const ip = getIp(req)
    return checkRateLimit(expensiveReadLimiter, `digital-id-public:${ip}`)
  }

  return null
}

/**
 * Reject oversized request bodies early (LPDoS defence). Pure Content-Length
 * header check — no body is read or buffered, so the cost is negligible. Upload
 * and CSV-import routes legitimately send large multipart files and enforce their
 * own per-file size caps, so they are excluded. (Set client_max_body_size at the
 * reverse proxy as the authoritative backstop for chunked requests with no
 * Content-Length.)
 */
const MAX_JSON_BODY_BYTES = 1_000_000 // ~1 MB for JSON / mutation routes

function bodySizeGuard(req: NextRequest): NextResponse | null {
  const { method } = req
  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return null
  }
  const { pathname } = req.nextUrl
  if (!pathname.startsWith("/api/")) return null
  // Multipart uploads / CSV imports cap file size in their own handlers.
  if (pathname.startsWith("/api/upload/") || pathname.includes("/import/")) return null

  const len = Number(req.headers.get("content-length") ?? "0")
  if (Number.isFinite(len) && len > MAX_JSON_BODY_BYTES) {
    return NextResponse.json({ message: "Request body too large" }, { status: 413 })
  }
  return null
}

export default async function middleware(req: NextRequest) {
  // 0. Reject oversized request bodies up front (cheap header check, no body read)
  const oversize = bodySizeGuard(req)
  if (oversize) return oversize

  // 1. Apply rate limiting for the paths excluded from the auth matcher
  const rateLimitResponse = await rateLimitGuard(req)
  if (rateLimitResponse) return rateLimitResponse

  // 2. Delegate to NextAuth for auth + role checks (unchanged logic)
  return (auth((req) => {
    const { pathname } = req.nextUrl
    const session = req.auth

    // Allow public routes
    if (
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/contact") ||
      pathname.startsWith("/api/health") ||
      pathname === "/login" ||
      pathname === "/" ||
      pathname.startsWith("/id/") ||
      pathname.startsWith("/about") ||
      pathname.startsWith("/contact-us") ||
      pathname.startsWith("/terms-of-service") ||
      pathname.startsWith("/privacy-policy")
    ) {
      // Redirect authenticated users away from login
      // Skip if suspended (would cause a redirect loop: /login → dashboard → /login)
      if (session && pathname === "/login" && !session.user?.suspended) {
        const dashboard = getDashboardPath(session.user?.role ?? "")
        // getDashboardPath returns "/login" for unknown roles — avoid redirect loop
        if (dashboard !== "/login") {
          return NextResponse.redirect(new URL(dashboard, req.url))
        }
      }
      return NextResponse.next()
    }

    // All other protected routes require authentication
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // School suspended — force logout on next request (JWT refresh detected suspension)
    if (session.user?.suspended) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Force password reset before accessing any dashboard
    if (session.user?.mustResetPassword && pathname !== "/reset-password") {
      return NextResponse.redirect(new URL("/reset-password", req.url))
    }

    // If password already reset, don't let them back to /reset-password
    if (!session.user?.mustResetPassword && pathname === "/reset-password") {
      return NextResponse.redirect(new URL(getDashboardPath(session.user?.role ?? ""), req.url))
    }

    // Force profile completion for students and teachers (after password reset)
    const role = session.user?.role ?? ""
    const ROLES_REQUIRING_PROFILE = ["STUDENT", "TEACHER", "ADMIN"]

    if (
      ROLES_REQUIRING_PROFILE.includes(role) &&
      !session.user?.isProfileComplete &&
      !session.user?.mustResetPassword &&
      pathname !== "/complete-profile" &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/complete-profile", req.url))
    }

    // Same gate for API routes: an incomplete-profile user gets a 403 JSON (not a
    // redirect — API clients can't follow one to an HTML page). The completion
    // flow's own endpoints stay reachable so it can finish. (/api/auth/* and
    // other public APIs already returned via the public-routes block above.)
    const PROFILE_EXEMPT_API = [
      "/api/profile/complete",
      "/api/profile",
      "/api/upload/profile-picture",
    ]
    if (
      ROLES_REQUIRING_PROFILE.includes(role) &&
      !session.user?.isProfileComplete &&
      !session.user?.mustResetPassword &&
      pathname.startsWith("/api/") &&
      !PROFILE_EXEMPT_API.some((p) => pathname === p)
    ) {
      return NextResponse.json(
        { message: "Profile completion required" },
        { status: 403 }
      )
    }

    // Block already-completed users from /complete-profile
    if (
      (session.user?.isProfileComplete || !ROLES_REQUIRING_PROFILE.includes(role)) &&
      pathname === "/complete-profile"
    ) {
      return NextResponse.redirect(new URL(getDashboardPath(role), req.url))
    }

    // Role-based route protection
    for (const [route, requiredRole] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (session.user?.role !== requiredRole) {
          return NextResponse.redirect(new URL(getDashboardPath(session.user?.role ?? ""), req.url))
        }
        break
      }
    }

    return NextResponse.next()
  }) as (req: NextRequest) => Promise<NextResponse>)(req)
}

export const config = {
  // Widened from original: removed api/auth and api/contact exclusions so the
  // rate limit guard above can intercept POST requests to those paths.
  // Static assets and image files are still excluded.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp4|webm|ogg|mov|woff2?|ttf|otf)).*)",
  ],
}
