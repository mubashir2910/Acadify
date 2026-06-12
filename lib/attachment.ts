import { z } from "zod"

// ─── Shared attachment rules ──────────────────────────────────────────────────
// Used by every feature that stores an uploaded file (Class Log, Notifications).
// Centralised here so the upload route and the Zod schemas that validate stored
// URLs agree on host, formats and size limits.

/**
 * Cloudinary's canonical delivery host. The upload endpoint only ever returns
 * URLs on this host, so consumers reject any other host on write — this prevents
 * a crafted POST from storing an arbitrary (e.g. phishing) link that other users
 * would click.
 */
export const CLOUDINARY_HOST = "res.cloudinary.com"

/** Image formats Cloudinary reports under resource_type "image". */
export const ALLOWED_IMAGE_FORMATS: string[] = ["jpg", "png", "webp"]

/** Document formats Cloudinary reports under resource_type "raw". */
export const ALLOWED_DOC_FORMATS: string[] = ["pdf", "docx", "xlsx", "pptx", "doc", "xls", "ppt"]

/** Max upload size shared by all attachment uploads (images + documents). */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * A Zod string that must be an uploaded Cloudinary attachment URL. Reuse anywhere
 * a stored attachment URL is validated on write.
 */
export const cloudinaryUrlSchema = z
  .string()
  .url("Invalid attachment URL")
  .refine((u) => {
    try {
      return new URL(u).host === CLOUDINARY_HOST
    } catch {
      return false
    }
  }, "Attachment must be an uploaded file")
