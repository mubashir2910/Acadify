import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { v2 as cloudinary } from "cloudinary"
import { uploadImportLimiter, checkRateLimit } from "@/lib/rate-limit"
import { MAX_ATTACHMENT_SIZE, ALLOWED_IMAGE_FORMATS, ALLOWED_DOC_FORMATS } from "@/lib/attachment"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<{
      secure_url: string
      resource_type: string
      format: string
      public_id: string
    }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            folder: "acadify/class-log-attachments",
            public_id: `att_${session.user.id}_${Date.now()}`,
            overwrite: false,
          },
          (err, result) => {
            if (err || !result) reject(err ?? new Error("Upload failed"))
            else resolve(result as { secure_url: string; resource_type: string; format: string; public_id: string })
          }
        )
        .end(buffer)
    })

    // Validate actual file content via Cloudinary's server-side detection
    const isImage = result.resource_type === "image" && ALLOWED_IMAGE_FORMATS.includes(result.format)
    const isDoc = result.resource_type === "raw" && ALLOWED_DOC_FORMATS.includes(result.format)

    if (!isImage && !isDoc) {
      await cloudinary.uploader.destroy(result.public_id, { resource_type: result.resource_type })
      return NextResponse.json(
        { message: "Only images, PDF and Office documents (Word/Excel/PowerPoint) are accepted" },
        { status: 400 }
      )
    }

    // type buckets the format for icon/label purposes: image | pdf | doc
    const attachmentType = isImage ? "image" : result.format === "pdf" ? "pdf" : "doc"
    return NextResponse.json({
      url: result.secure_url,
      type: attachmentType,
      name: file.name,
      format: result.format,
    })
  } catch (error) {
    console.error("[POST /api/upload/attachment]", error)
    return NextResponse.json(
      { message: "Failed to upload attachment" },
      { status: 500 }
    )
  }
}
