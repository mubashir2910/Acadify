import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { updateSubscriptionSchema } from "@/schemas/subscription.schema"
import { updateSubscription } from "@/services/school.service"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { schoolCode } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }

  try {
    const input = updateSubscriptionSchema.parse(body)
    await updateSubscription(schoolCode, input.status, input.subscription_ends_at)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 422 }
      )
    }
    if (error instanceof Error && error.message === "SCHOOL_NOT_FOUND") {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }
    console.error("[PUT /api/schools/[schoolCode]/subscription]", error)
    return NextResponse.json(
      { message: "Failed to update subscription" },
      { status: 500 }
    )
  }
}
