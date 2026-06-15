import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { feeUploadLimiter, checkRateLimit } from "@/lib/rate-limit"
import { uploadToSpaces, getExtension, CONTENT_TYPES } from "@/lib/spaces"
import { magicMatchesExtension } from "@/lib/file-signature"

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB — accommodates higher-res screenshots
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

    // Validate the extension before upload (Spaces can't sniff the format).
    const ext = getExtension(file.name)
    if (!ALLOWED_FORMATS.includes(ext)) {
      return NextResponse.json(
        { message: "Only images (JPG, PNG, WEBP, HEIC) or PDF accepted" },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Defense-in-depth: confirm the bytes match the claimed extension.
    if (!magicMatchesExtension(buffer, ext)) {
      return NextResponse.json(
        { message: "File content does not match its type" },
        { status: 400 },
      )
    }

    const url = await uploadToSpaces(buffer, {
      key: `payment-proofs/proof_${session.user.id}_${Date.now()}.${ext}`,
      contentType: CONTENT_TYPES[ext],
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/upload/payment-proof]", error)
    return NextResponse.json({ message: "Failed to upload proof" }, { status: 500 })
  }
}
