import { z } from "zod"

// ─── Shared attachment rules ──────────────────────────────────────────────────
// Used by every feature that stores an uploaded file (Class Log, Notifications).
// Centralised here so the upload route and the Zod schemas that validate stored
// URLs agree on host, formats and size limits.

/**
 * Our DigitalOcean Spaces delivery hosts (CDN + origin). The upload endpoints
 * only ever return URLs on these hosts, so consumers reject any other host on
 * write — this prevents a crafted POST from storing an arbitrary (e.g. phishing)
 * link that other users would click. Hard-coded (not read from env) because this
 * schema also runs in the browser, where server-only env vars are undefined.
 */
export const SPACES_HOSTS = [
  "acadify.sgp1.cdn.digitaloceanspaces.com",
  "acadify.sgp1.digitaloceanspaces.com",
]

/** Accepted image extensions for attachment uploads. */
export const ALLOWED_IMAGE_FORMATS: string[] = ["jpg", "png", "webp"]

/** MIME type → file extension for the image formats accepted by upload routes. */
export const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/** Accepted document extensions for attachment uploads. */
export const ALLOWED_DOC_FORMATS: string[] = ["pdf", "docx", "xlsx", "pptx", "doc", "xls", "ppt"]

/** Max upload size shared by all attachment uploads (images + documents). */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * A Zod string that must be an uploaded attachment URL on one of our Spaces
 * hosts. Reuse anywhere a stored attachment URL is validated on write.
 */
export const attachmentUrlSchema = z
  .string()
  .url("Invalid attachment URL")
  .refine((u) => {
    try {
      return SPACES_HOSTS.includes(new URL(u).host)
    } catch {
      return false
    }
  }, "Attachment must be an uploaded file")
