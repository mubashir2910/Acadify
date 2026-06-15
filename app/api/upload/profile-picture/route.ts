import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadImportLimiter, checkRateLimit } from "@/lib/rate-limit"
import { uploadToSpaces, CONTENT_TYPES } from "@/lib/spaces"
import { magicMatchesExtension } from "@/lib/file-signature"
import { IMAGE_MIME_TO_EXT as IMAGE_EXT } from "@/lib/attachment"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

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

    // Defense-in-depth: verify the bytes are a real image of the claimed type,
    // not just a spoofed client MIME.
    if (!magicMatchesExtension(buffer, ext)) {
      return NextResponse.json(
        { message: "File content does not match its type" },
        { status: 400 }
      )
    }

    // Unique key per upload so a changed avatar never serves a stale CDN cache.
    const url = await uploadToSpaces(buffer, {
      key: `profile-pictures/user_${session.user.id}_${Date.now()}.${ext}`,
      contentType: CONTENT_TYPES[ext],
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
