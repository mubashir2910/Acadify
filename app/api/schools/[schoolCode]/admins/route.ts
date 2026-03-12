import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { createAdminSchema } from "@/schemas/admin.schema"
import { createAdmin, getAdminsBySchoolCode } from "@/services/admin.service"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolCode: string }> }
) {
  const { schoolCode } = await params
  const admins = await getAdminsBySchoolCode(schoolCode)
  return NextResponse.json(admins)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolCode: string }> }
) {
  const { schoolCode } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }

  let input
  try {
    input = createAdminSchema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 422 }
      )
    }
    throw error
  }

  try {
    const result = await createAdmin(schoolCode, input.name, input.username)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SCHOOL_NOT_FOUND") {
        return NextResponse.json({ message: "School not found" }, { status: 404 })
      }
      if (error.message === "USERNAME_TAKEN") {
        return NextResponse.json(
          { message: "Username is already taken" },
          { status: 409 }
        )
      }
    }
    console.error("[POST /api/schools/[schoolCode]/admins]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
