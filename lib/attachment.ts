import { z } from "zod"

// Shared attachment rules used by upload and feature-level validation.

/**
 * Approved upload delivery hosts. New uploads use the R2 custom domain; the
 * DigitalOcean hosts remain temporarily so legacy database URLs still validate.
 * This list is hard-coded because the schemas also execute in the browser.
 */
export const UPLOAD_HOSTS = [
  "media.acadify.tech",
  "acadify.sgp1.cdn.digitaloceanspaces.com",
  "acadify.sgp1.digitaloceanspaces.com",
]

export function isAllowedUploadUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && UPLOAD_HOSTS.includes(url.host)
  } catch {
    return false
  }
}

/** Accepted image extensions for attachment uploads. */
export const ALLOWED_IMAGE_FORMATS: string[] = ["jpg", "png", "webp"]

/** MIME type to file extension for image formats accepted by upload routes. */
export const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/** Accepted document extensions for attachment uploads. */
export const ALLOWED_DOC_FORMATS: string[] = ["pdf", "docx", "xlsx", "pptx", "doc", "xls", "ppt"]

/** Max upload size shared by all attachment uploads (images + documents). */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

/** A URL that must use one of our approved upload delivery hosts. */
export const attachmentUrlSchema = z
  .string()
  .url("Invalid attachment URL")
  .refine(isAllowedUploadUrl, "Attachment must be an uploaded file")
