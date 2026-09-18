import "server-only"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

// Cloudflare R2 is S3-compatible, so the existing AWS SDK client can be used.
// Initialize lazily so non-upload build steps do not require credentials.
let r2Client: S3Client | undefined

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: requiredEnv("R2_ENDPOINT"),
      credentials: {
        accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: false,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    })
  }

  return r2Client
}

/** Authoritative validated file extension to Content-Type map. */
export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

/** Lowercased file extension without the dot, or an empty string if absent. */
export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  if (dot === -1 || dot === filename.length - 1) return ""
  return filename.slice(dot + 1).toLowerCase()
}

/** Upload a buffer to R2 and return the public custom-domain URL to persist. */
export async function uploadToR2(
  buffer: Buffer,
  opts: { key: string; contentType: string }
): Promise<string> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: requiredEnv("R2_BUCKET"),
      Key: opts.key,
      Body: buffer,
      ContentType: opts.contentType,
    })
  )

  const publicBaseUrl = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "")
  return `${publicBaseUrl}/${opts.key}`
}
