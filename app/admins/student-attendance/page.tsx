import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import TeacherAttendanceSection from "@/app/teacher/attendance/components/TeacherAttendanceSection"

// Shown only to admins who have been assigned as a class teacher. Reuses the
// teacher's section component which is fully user-id-driven; the API routes
// detect class-teacher status by the user's Teacher row, regardless of role.
// Server-side guard: redirect non-class-teacher admins back to their dashboard.
export default async function AdminStudentAttendancePage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const teacher = await prisma.teacher.findFirst({
    where: { user_id: session.user.id, status: "ACTIVE" },
    select: { classTeacher: { select: { id: true } } },
  })
  if (!teacher?.classTeacher) {
    redirect("/admins")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Student Attendance</h1>
      <TeacherAttendanceSection forceClassScope />
    </div>
  )
}
