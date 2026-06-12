import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadImportLimiter, checkRateLimit } from "@/lib/rate-limit"
import { uploadToSpaces } from "@/lib/spaces"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
// MIME → file extension for the image formats we accept.
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

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

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    const ext = IMAGE_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { message: "Only JPEG, PNG, and WebP images are accepted" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Image must be under 2MB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Unique key per upload so a changed avatar never serves a stale CDN cache.
    const url = await uploadToSpaces(buffer, {
      key: `profile-pictures/user_${session.user.id}_${Date.now()}.${ext}`,
      contentType: file.type,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/upload/profile-picture]", error)
    return NextResponse.json(
      { message: "Failed to upload image" },
      { status: 500 }
    )
  }
}
