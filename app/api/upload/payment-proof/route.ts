import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { v2 as cloudinary } from "cloudinary"
import { feeUploadLimiter, checkRateLimit } from "@/lib/rate-limit"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB — accommodates higher-res screenshots
// Cloudinary returns PDFs with resource_type="image" (not "raw") when uploaded
// via resource_type: "auto", because it can render PDF pages as images. So we
// accept by `format` alone and ignore `resource_type` for the allow-list check.
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "heic", "pdf"]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (!["STUDENT", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(feeUploadLimiter, `fee-upload:${session.user.id}`)
  if (limited) return limited

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "File must be under 3MB" }, { status: 400 })
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
            folder: "acadify/payment-proofs",
            public_id: `proof_${session.user.id}_${Date.now()}`,
            // Allow image + pdf (resource_type: 'auto')
            resource_type: "auto",
          },
          (err, result) => {
            if (err || !result) reject(err ?? new Error("Upload failed"))
            else
              resolve(
                result as {
                  secure_url: string
                  resource_type: string
                  format: string
                  public_id: string
                },
              )
          },
        )
        .end(buffer)
    })

    if (!ALLOWED_FORMATS.includes(result.format)) {
      await cloudinary.uploader.destroy(result.public_id, { resource_type: result.resource_type })
      return NextResponse.json(
        { message: "Only images (JPG, PNG, WEBP, HEIC) or PDF accepted" },
        { status: 400 },
      )
    }

    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error("[POST /api/upload/payment-proof]", error)
    return NextResponse.json({ message: "Failed to upload proof" }, { status: 500 })
  }
}
