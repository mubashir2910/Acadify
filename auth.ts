import "server-only"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { verifyCredentials, isUserSchoolSuspended } from "@/services/auth.service"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await verifyCredentials(
          credentials.username as string,
          credentials.password as string
        )
        if (!user) return null

        // Carry the "remember me" choice into the JWT so jwt.encode can size the
        // token's lifetime (30 days vs 6 days). Sent as a string by the form.
        const remember = credentials.remember === "true" || credentials.remember === true
        return { ...user, remember }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks, // keep edge-compatible session callback
    async jwt({ token, user, trigger, session }) {
      // Initial login: populate all fields from the authorized user object
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.mustResetPassword = (user as { mustResetPassword: boolean }).mustResetPassword
        token.isProfileComplete = (user as { isProfileComplete: boolean }).isProfileComplete
        token.remember = (user as { remember?: boolean }).remember ?? false
        token.suspended = false
        return token
      }

      // updateSession() called client-side (e.g. after password reset or profile completion)
      if (trigger === "update") {
        if (session?.mustResetPassword === false) token.mustResetPassword = false
        if (session?.isProfileComplete === true) token.isProfileComplete = true
        return token
      }

      // Periodic token refresh (every updateAge = 15 min): re-check school suspension
      // SUPER_ADMIN has no school, so skip the check for them
      if (token.id && token.role !== "SUPER_ADMIN") {
        token.suspended = await isUserSchoolSuspended(
          token.id as string,
          token.role as string
        )
      }

      return token
    },
  },
})
