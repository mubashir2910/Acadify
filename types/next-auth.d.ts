import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      mustResetPassword: boolean
      isProfileComplete: boolean
      suspended: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    role: string
    mustResetPassword: boolean
    isProfileComplete: boolean
    // "Remember me" choice, carried from sign-in into the JWT to size its lifetime.
    remember?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    mustResetPassword: boolean
    isProfileComplete: boolean
    suspended: boolean
    // true → 30-day token, false/undefined → 6-day token (see auth.config jwt.encode)
    remember?: boolean
  }
}
