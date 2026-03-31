import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "acadify/profile-pictures",
            public_id: `user_${session.user.id}`,
            overwrite: true,
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
            ],
          },
          (err, result) => {
            if (err || !result) reject(err ?? new Error("Upload failed"))
            else resolve(result as { secure_url: string })
          }
        )
        .end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error("[POST /api/upload/profile-picture]", error)
    return NextResponse.json(
      { message: "Failed to upload image" },
      { status: 500 }
    )
  }
}
