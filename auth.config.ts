import type { NextAuthConfig } from "next-auth"

/**
 * Edge-compatible auth config — no Node.js-only imports (no bcrypt, no prisma).
 * Used by middleware for JWT verification and session hydration.
 * The jwt callback lives in auth.ts (Node.js) so it can call Prisma for suspension checks.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // providers with Node.js deps are added only in auth.ts
  callbacks: {
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.mustResetPassword = token.mustResetPassword as boolean
      session.user.isProfileComplete = token.isProfileComplete as boolean
      session.user.suspended = (token.suspended as boolean) ?? false
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60,  // 10 days
    updateAge: 15 * 60,          // refresh JWT every 15 minutes of activity
  },
}
