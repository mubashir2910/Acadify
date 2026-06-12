import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadImportLimiter, checkRateLimit } from "@/lib/rate-limit"
import { MAX_ATTACHMENT_SIZE, ALLOWED_IMAGE_FORMATS, ALLOWED_DOC_FORMATS } from "@/lib/attachment"
import { uploadToSpaces, getExtension, CONTENT_TYPES } from "@/lib/spaces"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const limited = await checkRateLimit(uploadImportLimiter, `upload:${session.user.id}`)
  if (limited) return limited

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json(
        { message: "File must be under 10MB" },
        { status: 400 }
      )
    }

    // Spaces (unlike Cloudinary) can't sniff the file type after upload, so we
    // validate the extension up front. Normalise jpeg → jpg to match the
    // allow-list, then reject anything that isn't an accepted image or document.
    const rawExt = getExtension(file.name)
    const ext = rawExt === "jpeg" ? "jpg" : rawExt
    const isImage = ALLOWED_IMAGE_FORMATS.includes(ext)
    const isDoc = ALLOWED_DOC_FORMATS.includes(ext)

    if (!isImage && !isDoc) {
      return NextResponse.json(
        { message: "Only images, PDF and Office documents (Word/Excel/PowerPoint) are accepted" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const url = await uploadToSpaces(buffer, {
      key: `class-log-attachments/att_${session.user.id}_${Date.now()}.${ext}`,
      contentType: CONTENT_TYPES[ext],
    })

    // type buckets the format for icon/label purposes: image | pdf | doc
    const attachmentType = isImage ? "image" : ext === "pdf" ? "pdf" : "doc"
    return NextResponse.json({
      url,
      type: attachmentType,
      name: file.name,
      format: ext,
    })
  } catch (error) {
    console.error("[POST /api/upload/attachment]", error)
    return NextResponse.json(
      { message: "Failed to upload attachment" },
      { status: 500 }
    )
  }
}
