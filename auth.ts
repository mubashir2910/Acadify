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
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await verifyCredentials(
          credentials.username as string,
          credentials.password as string
        )

        return user ?? null
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
