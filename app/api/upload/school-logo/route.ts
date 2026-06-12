import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { v2 as cloudinary } from "cloudinary"
import { uploadImportLimiter, checkRateLimit } from "@/lib/rate-limit"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Uploads a school logo to Cloudinary at folder `acadify/school-logos`.
 * Identified by the school's UUID so re-uploads overwrite the prior asset.
 *
 * Body: multipart/form-data with `file` (image) + `schoolCode` (string).
 * Auth: SUPER_ADMIN, or ADMIN with a SchoolUser record for the target school.
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
    if (!ALLOWED_TYPES.includes(file.type)) {
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "acadify/school-logos",
            public_id: `school_${school.id}`,
            overwrite: true,
            transformation: [{ width: 512, height: 512, crop: "limit" }],
          },
          (err, result) => {
            if (err || !result) reject(err ?? new Error("Upload failed"))
            else resolve(result as { secure_url: string })
          },
        )
        .end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error("[POST /api/upload/school-logo]", error)
    return NextResponse.json({ message: "Failed to upload logo" }, { status: 500 })
  }
}
