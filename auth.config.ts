import type { NextAuthConfig } from "next-auth"
import { encode as defaultJwtEncode } from "next-auth/jwt"

/**
 * Edge-compatible auth config — no Node.js-only imports (no bcrypt, no prisma).
 * Used by middleware for JWT verification and session hydration.
 * The jwt callback lives in auth.ts (Node.js) so it can call Prisma for suspension checks.
 */

// "Remember me" session windows. Both are sliding and rotate every 15 min
// (updateAge) so school-suspension is re-checked regardless of the choice.
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60 // 30 days (box checked)
const DEFAULT_MAX_AGE = 6 * 24 * 60 * 60 // 6 days (box unchecked)
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
    // Cookie persistence ceiling = the longest possible session (30 days). The
    // ACTUAL token validity is set per-login in jwt.encode below (30d if the user
    // checked "remember me", else 6d); a non-remembered token simply expires
    // server-side at 6 days even though the cookie could linger longer.
    maxAge: REMEMBER_MAX_AGE,
    updateAge: 15 * 60, // rotate the JWT every 15 minutes of activity (suspension re-check)
  },
  jwt: {
    // session.maxAge is a single global value, so to give "remember me" a longer
    // life than a normal login we override the JWT's exp here: delegate to the
    // default encoder but pass a per-token maxAge derived from token.remember.
    // Runs again on every 15-min rotation, so the window slides for the lifetime
    // of the chosen duration.
    async encode(params) {
      const remember = (params.token as { remember?: boolean } | undefined)?.remember
      return defaultJwtEncode({
        ...params,
        maxAge: remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE,
      })
    },
  },
}
