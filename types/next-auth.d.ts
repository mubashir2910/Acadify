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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    mustResetPassword: boolean
    isProfileComplete: boolean
    suspended: boolean
  }
}
