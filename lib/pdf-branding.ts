/**
 * Helpers for embedding school branding (logo, motto, brand color) into PDFs.
 * Used by receipts, report cards, and future certificates.
 */

export type RgbTriple = { r: number; g: number; b: number }

export function hexToRgb(hex: string | null | undefined): RgbTriple {
  const fallback = { r: 0.06, g: 0.09, b: 0.16 } // slate-900-ish
  if (!hex) return fallback
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return fallback
  const n = parseInt(m[1], 16)
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  }
}

export type SchoolBrandAssets = {
  logoBytes: Uint8Array | null
  logoMime: "image/png" | "image/jpeg" | null
  motto: string | null
  brandColor: RgbTriple
}

/**
 * Fetches the school's logo from Cloudinary (or any public URL) and resolves
 * the brand color into RGB. Gracefully degrades if the fetch fails.
 */
export async function loadSchoolBrandAssets(school: {
  logo_url?: string | null
  motto?: string | null
  brand_color?: string | null
}): Promise<SchoolBrandAssets> {
  const brandColor = hexToRgb(school.brand_color)
  const motto = school.motto?.trim() || null

  if (!school.logo_url) {
    return { logoBytes: null, logoMime: null, motto, brandColor }
  }

  try {
    const res = await fetch(school.logo_url)
    if (!res.ok) {
      return { logoBytes: null, logoMime: null, motto, brandColor }
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase()
    let logoMime: "image/png" | "image/jpeg" | null = null
    if (contentType.includes("png")) logoMime = "image/png"
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) logoMime = "image/jpeg"
    if (!logoMime) {
      return { logoBytes: null, logoMime: null, motto, brandColor }
    }
    const buffer = await res.arrayBuffer()
    return {
      logoBytes: new Uint8Array(buffer),
      logoMime,
      motto,
      brandColor,
    }
  } catch (err) {
    console.warn("[loadSchoolBrandAssets] failed to fetch logo", err)
    return { logoBytes: null, logoMime: null, motto, brandColor }
  }
}

/**
 * Picks a readable text color (white or near-black) given a background brand color.
 * Uses YIQ luminance — same heuristic the W3C accessibility guide recommends.
 */
export function contrastingTextColor(bg: RgbTriple): RgbTriple {
  const luminance = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b
  return luminance > 0.6 ? { r: 0.1, g: 0.1, b: 0.1 } : { r: 1, g: 1, b: 1 }
}

const IST_DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
})
const IST_TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
})

/** Formats a Date as `31 May 2026, 12:57 AM IST` regardless of host timezone. */
export function formatDateTimeIST(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ""
  return `${IST_DATE_FMT.format(d)}, ${IST_TIME_FMT.format(d)} IST`
}

/** Date-only IST formatter for places that only need `31 May 2026`. */
export function formatDateIST(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ""
  return IST_DATE_FMT.format(d)
}
