import type { NextAuthConfig } from "next-auth"

/**
 * Edge-compatible auth config — no Node.js-only imports (no bcrypt, no prisma).
 * Used by middleware for JWT verification and session hydration.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // providers with Node.js deps are added only in auth.ts
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.mustResetPassword = (user as { mustResetPassword: boolean }).mustResetPassword
      }
      // When updateSession() is called client-side after password reset, clear the flag
      if (trigger === "update" && session?.mustResetPassword === false) {
        token.mustResetPassword = false
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.mustResetPassword = token.mustResetPassword as boolean
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
}
