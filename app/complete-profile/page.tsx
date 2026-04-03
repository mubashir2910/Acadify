import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDashboardPath } from "@/lib/auth-redirect"
import { StudentCompleteProfileForm } from "./components/StudentCompleteProfileForm"
import { TeacherCompleteProfileForm } from "./components/TeacherCompleteProfileForm"
import { AdminCompleteProfileForm } from "./components/AdminCompleteProfileForm"

const ROLES_REQUIRING_PROFILE = ["STUDENT", "TEACHER", "ADMIN"]

export default async function CompleteProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const { role } = session.user

  if (!ROLES_REQUIRING_PROFILE.includes(role)) {
    redirect(getDashboardPath(role))
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-11 w-11 bg-[#1e2a4a] rounded-xl flex items-center justify-center text-white text-lg font-bold">
              A
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Complete Your Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Please fill in your details before accessing your dashboard.
          </p>
        </div>

        {/* Role-specific form */}
        {role === "STUDENT" && (
          <StudentCompleteProfileForm userName={session.user.name ?? ""} />
        )}
        {role === "TEACHER" && (
          <TeacherCompleteProfileForm userName={session.user.name ?? ""} />
        )}
        {role === "ADMIN" && (
          <AdminCompleteProfileForm userName={session.user.name ?? ""} />
        )}
      </div>
    </div>
  )
}
