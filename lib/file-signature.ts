// ─── Magic-byte file signature validation (dependency-free) ───────────────────
// Confirms an uploaded file's leading bytes are consistent with its claimed
// extension, so a spoofed MIME type or a renamed payload (e.g. evil.exe → x.png)
// is rejected before it reaches storage. This is defense-in-depth layered ON TOP
// of each upload route's extension / MIME allow-list — it is NOT a replacement.
//
// Note on Office formats: OOXML (docx/xlsx/pptx) are ZIP containers and the
// legacy formats (doc/xls/ppt) are OLE/CFB compound files, so the signature can
// only confirm the *container* ("is a zip" / "is an OLE file"), not which Office
// app produced it. That still blocks executables/scripts, which is the goal.

type ByteCheck = (buf: Buffer) => boolean

/** True if `buf` begins with exactly `bytes`. */
function startsWith(bytes: number[]): ByteCheck {
  return (buf) => {
    if (buf.length < bytes.length) return false
    for (let i = 0; i < bytes.length; i++) {
      if (buf[i] !== bytes[i]) return false
    }
    return true
  }
}

/** True if the ASCII `text` appears at byte `offset`. */
function asciiAt(buf: Buffer, offset: number, text: string): boolean {
  if (buf.length < offset + text.length) return false
  for (let i = 0; i < text.length; i++) {
    if (buf[offset + i] !== text.charCodeAt(i)) return false
  }
  return true
}

const isJpeg: ByteCheck = startsWith([0xff, 0xd8, 0xff])
const isPng: ByteCheck = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const isWebp: ByteCheck = (buf) => asciiAt(buf, 0, "RIFF") && asciiAt(buf, 8, "WEBP")

// HEIC/HEIF: ISO-BMFF with an "ftyp" box at offset 4 and a HEIF-family brand.
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis", "hevm", "hevs"]
const isHeic: ByteCheck = (buf) =>
  asciiAt(buf, 4, "ftyp") && HEIC_BRANDS.some((brand) => asciiAt(buf, 8, brand))

const isPdf: ByteCheck = startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]) // "%PDF-"

// ZIP (covers OOXML docx/xlsx/pptx): local-file, empty-archive, or spanned marker.
const isZip: ByteCheck = (buf) =>
  startsWith([0x50, 0x4b, 0x03, 0x04])(buf) ||
  startsWith([0x50, 0x4b, 0x05, 0x06])(buf) ||
  startsWith([0x50, 0x4b, 0x07, 0x08])(buf)

// OLE/CFB compound file (covers legacy doc/xls/ppt).
const isOle: ByteCheck = startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])

// Accepted extension → the byte check(s) that satisfy it.
const SIGNATURES: Record<string, ByteCheck[]> = {
  jpg: [isJpeg],
  jpeg: [isJpeg],
  png: [isPng],
  webp: [isWebp],
  heic: [isHeic],
  pdf: [isPdf],
  docx: [isZip],
  xlsx: [isZip],
  pptx: [isZip],
  doc: [isOle],
  xls: [isOle],
  ppt: [isOle],
}

/**
 * Returns true if `buffer`'s leading bytes match the signature(s) expected for
 * `ext` (case-insensitive, leading dot tolerated). Unknown extensions or buffers
 * too short to identify return false — callers must have already passed their own
 * extension/MIME allow-list, so an unknown ext here means "reject".
 */
export function magicMatchesExtension(buffer: Buffer, ext: string): boolean {
  const key = ext.replace(/^\./, "").toLowerCase()
  const checks = SIGNATURES[key]
  if (!checks) return false
  return checks.some((check) => check(buffer))
}
