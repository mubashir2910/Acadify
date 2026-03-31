import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSchoolByCode, deleteSchool } from "@/services/school.service"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { schoolCode } = await params
  const school = await getSchoolByCode(schoolCode)
  if (!school) return NextResponse.json({ message: "School not found" }, { status: 404 })
  return NextResponse.json(school)
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { schoolCode } = await params

  try {
    await deleteSchool(schoolCode)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ message: "Failed to delete school" }, { status: 500 })
  }
}
