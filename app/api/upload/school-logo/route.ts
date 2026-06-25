import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadImportLimiter, checkRateLimit } from "@/lib/rate-limit"
import { uploadToSpaces, CONTENT_TYPES } from "@/lib/spaces"
import { magicMatchesExtension } from "@/lib/file-signature"
import { IMAGE_MIME_TO_EXT as IMAGE_EXT } from "@/lib/attachment"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * Uploads a school logo to Spaces under `school-logos/`.
 * Body: multipart/form-data with `file` (image) + `schoolCode` (string).
 * Auth: SUPER_ADMIN, or ADMIN with an active SchoolUser record for the target school.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(uploadImportLimiter, `upload:${session.user.id}`)
  if (limited) return limited

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const schoolCode = (formData.get("schoolCode") as string | null)?.trim()

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }
    if (!schoolCode) {
      return NextResponse.json({ message: "schoolCode is required" }, { status: 400 })
    }
    const ext = IMAGE_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { message: "Only JPEG, PNG, and WebP images are accepted" },
        { status: 400 },
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Logo must be under 2MB" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { schoolCode },
      select: { id: true },
    })
    if (!school) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    if (session.user.role !== "SUPER_ADMIN") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
      const membership = await prisma.schoolUser.findFirst({
        where: {
          user_id: session.user.id,
          school_id: school.id,
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      })
      if (!membership) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Defense-in-depth: verify the bytes are a real image of the claimed type.
    if (!magicMatchesExtension(buffer, ext)) {
      return NextResponse.json(
        { message: "File content does not match its type" },
        { status: 400 },
      )
    }

    // Unique key per upload so a re-uploaded logo never serves a stale CDN cache.
    const url = await uploadToSpaces(buffer, {
      key: `school-logos/school_${school.id}_${Date.now()}.${ext}`,
      contentType: CONTENT_TYPES[ext],
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/upload/school-logo]", error)
    return NextResponse.json({ message: "Failed to upload logo" }, { status: 500 })
  }
}
