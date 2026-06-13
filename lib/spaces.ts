import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// ─── DigitalOcean Spaces (S3-compatible) upload helper ────────────────────────
// Single source of truth for pushing uploaded files to Spaces, mirroring how
// lib/attachment.ts centralises the upload rules. All five upload routes
// (profile picture, school logo, QR code, class-log attachment, payment proof)
// go through uploadToSpaces() so the S3 config lives in exactly one place.

// `endpoint` MUST be the region root WITHOUT the bucket (e.g.
// https://sgp1.digitaloceanspaces.com). With forcePathStyle:false the SDK
// prepends the bucket itself → acadify.sgp1.digitaloceanspaces.com. Passing the
// bucket-prefixed URL here would double it (acadify.acadify.sgp1...) and fail.
const s3 = new S3Client({
  region: process.env.SPACES_REGION!,
  endpoint: process.env.SPACES_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.SPACES_KEY!,
    secretAccessKey: process.env.SPACES_SECRET!,
  },
  forcePathStyle: false,
  // Recent @aws-sdk/client-s3 versions add CRC32 trailer checksums by default,
  // which DigitalOcean Spaces rejects (every upload would fail). Restricting
  // checksums to "when required" disables that default and keeps Spaces happy.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
})

/**
 * Authoritative file extension → Content-Type map. The upload routes set
 * ContentType from the *validated* extension (never the client-supplied
 * file.type), so a spoofed MIME can't mislabel a stored object. Setting the
 * correct ContentType is what makes PDFs preview inline and Office documents
 * download properly when opened from their Spaces URL.
 */
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

/**
 * Lowercased file extension (without the dot) from a filename, or "" if none.
 * e.g. "Report.final.PDF" → "pdf".
 */
export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  if (dot === -1 || dot === filename.length - 1) return ""
  return filename.slice(dot + 1).toLowerCase()
}

/**
 * Uploads a buffer to the Spaces bucket as a public-read object and returns its
 * public CDN URL (the value stored in the database).
 */
export async function uploadToSpaces(
  buffer: Buffer,
  opts: { key: string; contentType: string }
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.SPACES_BUCKET!,
      Key: opts.key,
      Body: buffer,
      ContentType: opts.contentType,
      ACL: "public-read",
    })
  )
  return `${process.env.SPACES_CDN_ENDPOINT}/${opts.key}`
}
