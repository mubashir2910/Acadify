import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./auth.config"
import { getDashboardPath } from "@/lib/auth-redirect"

// Lightweight edge-compatible auth — only verifies the JWT, no bcrypt/prisma imported.
const { auth } = NextAuth(authConfig)

// Routes that require a specific role
const ROLE_ROUTES: Record<string, string> = {
  "/super-admins": "SUPER_ADMIN",
  "/admins": "ADMIN",
  "/teacher": "TEACHER",
  "/student": "STUDENT",
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Allow public routes
  if (
    pathname === "/login" ||
    pathname === "/" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact-us") ||
    pathname.startsWith("/terms-of-service") ||
    pathname.startsWith("/privacy-policy")
  ) {
    // Redirect authenticated users away from login
    if (session && pathname === "/login") {
      const dashboard = getDashboardPath(session.user?.role ?? "")
      return NextResponse.redirect(new URL(dashboard, req.url))
    }
    return NextResponse.next()
  }

  // All other protected routes require authentication
  if (!session) {
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
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/contact).*)",
  ],
}
