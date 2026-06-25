import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { formatClassSection } from "@/lib/roman"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags } from "@/lib/cache-keys"
import type { DigitalIdCard } from "@/schemas/digital-id.schema"

// Human-readable label for the card subtitle (Role · School).
const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  ADMIN: "Administrator",
}

// Roles allowed a Digital ID card. Super admins are internal staff (no school ID).
export const DIGITAL_ID_ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const

// Each ID photo upload consumes storage, so changes are capped per calendar month.
export const PHOTO_CHANGE_LIMIT = 2

// Thrown when a user has exhausted their monthly photo-change allowance. The API
// layer maps this to a 429 with this message.
export class DigitalIdLimitError extends Error {
  constructor() {
    super(
      `You can change your ID photo only ${PHOTO_CHANGE_LIMIT} times a month. Please try again next month.`
    )
    this.name = "DigitalIdLimitError"
  }
}

// "YYYY-MM" in IST — the reset boundary aligns with the school's local month.
function currentPeriodKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date())
  const year = parts.find((p) => p.type === "year")!.value
  const month = parts.find((p) => p.type === "month")!.value
  return `${year}-${month}`
}

// Single select shape reused for both the owner lookup (by id) and the public
// lookup (by token), so both paths build an identical card payload.
const cardSelect = {
  name: true,
  username: true,
  role: true,
  profile_picture: true,
  digital_id_photo: true,
  digital_id_token: true,
  students: {
    select: {
      class: true,
      section: true,
      school: { select: { schoolName: true } },
    },
  },
  teachers: {
    select: {
      school: { select: { schoolName: true } },
      classTeacher: { select: { class: true, section: true } },
    },
  },
  schoolUsers: {
    where: { role: "ADMIN" as const },
    select: { school: { select: { schoolName: true } } },
    take: 1,
  },
} as const

type CardRow = {
  name: string
  username: string
  role: string
  profile_picture: string | null
  digital_id_photo: string | null
  digital_id_token: string | null
  students: { class: string; section: string; school: { schoolName: string } }[]
  teachers: {
    school: { schoolName: string }
    classTeacher: { class: string; section: string } | null
  }[]
  schoolUsers: { school: { schoolName: string } }[]
}

// Maps a DB row to the card payload, resolving role-specific class/section + school.
function buildCard(user: CardRow): DigitalIdCard {
  let schoolName: string | null = null
  let classSection = ""

  if (user.role === "STUDENT") {
    const s = user.students[0]
    schoolName = s?.school.schoolName ?? null
    classSection = formatClassSection(s?.class, s?.section)
  } else if (user.role === "TEACHER") {
    const t = user.teachers[0]
    schoolName = t?.school.schoolName ?? null
    // Show the assigned class only when the teacher is a class teacher.
    classSection = formatClassSection(t?.classTeacher?.class, t?.classTeacher?.section)
  } else if (user.role === "ADMIN") {
    schoolName = user.schoolUsers[0]?.school.schoolName ?? null
  }

  // The ID photo is the dedicated half-body shot when set, otherwise the avatar.
  const photoUrl = user.digital_id_photo ?? user.profile_picture ?? null

  return {
    name: user.name,
    roleLabel: ROLE_LABELS[user.role] ?? user.role,
    schoolName,
    classSection,
    acadifyId: user.username,
    photoUrl,
    hasCustomPhoto: !!user.digital_id_photo,
    shareToken: user.digital_id_token,
  }
}

// ─── GET card for the logged-in user ──────────────────────────────────────────

export async function getDigitalIdCard(userId: string): Promise<DigitalIdCard | null> {
  return cached(
    cacheKeys.digitalId(userId),
    { ttl: 1800, tags: [cacheTags.digitalId(userId)] },
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: cardSelect,
      })
      if (!user) return null
      return buildCard(user as CardRow)
    }
  )
}

// ─── GET card by public share token (no auth) ─────────────────────────────────

export async function getDigitalIdByToken(token: string): Promise<DigitalIdCard | null> {
  // Resolve the owner first so the public-card cache can be tagged by userId and
  // thus busted when that user edits their profile/photo.
  const owner = await prisma.user.findUnique({
    where: { digital_id_token: token },
    select: { id: true },
  })
  if (!owner) return null

  return cached(
    cacheKeys.digitalIdPublic(token),
    { ttl: 1800, tags: [cacheTags.digitalId(owner.id)] },
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: owner.id },
        select: cardSelect,
      })
      if (!user) return null
      return buildCard(user as CardRow)
    }
  )
}

// ─── Monthly photo-change quota ───────────────────────────────────────────────

/**
 * How many ID-photo changes the user has left this (IST) month. A new month
 * resets the allowance even before any write, so the count is derived against the
 * current period rather than trusting a stale stored counter.
 */
export async function getDigitalIdPhotoQuota(
  userId: string
): Promise<{ limit: number; remaining: number }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { digital_id_photo_changes: true, digital_id_photo_period: true },
  })
  const used =
    u && u.digital_id_photo_period === currentPeriodKey() ? u.digital_id_photo_changes : 0
  return { limit: PHOTO_CHANGE_LIMIT, remaining: Math.max(0, PHOTO_CHANGE_LIMIT - used) }
}

/** Throws DigitalIdLimitError when the monthly allowance is exhausted. */
export async function assertCanChangeDigitalIdPhoto(userId: string): Promise<void> {
  const { remaining } = await getDigitalIdPhotoQuota(userId)
  if (remaining <= 0) throw new DigitalIdLimitError()
}

// ─── SET the dedicated ID-card photo (or clear it) ────────────────────────────
// Setting a new photo is rate-limited to PHOTO_CHANGE_LIMIT per month. Clearing
// (url === null) is not a "change" and never consumes the allowance. The read +
// increment runs in a transaction so concurrent submits can't exceed the cap.

export async function setDigitalIdPhoto(userId: string, url: string | null): Promise<void> {
  if (url === null) {
    await prisma.user.update({
      where: { id: userId },
      data: { digital_id_photo: null },
    })
    await invalidateTags(cacheTags.digitalId(userId))
    return
  }

  const period = currentPeriodKey()

  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { digital_id_photo_changes: true, digital_id_photo_period: true },
    })

    // Reset the counter when the stored period is from a previous month.
    const used = u && u.digital_id_photo_period === period ? u.digital_id_photo_changes : 0
    if (used >= PHOTO_CHANGE_LIMIT) throw new DigitalIdLimitError()

    await tx.user.update({
      where: { id: userId },
      data: {
        digital_id_photo: url,
        digital_id_photo_period: period,
        digital_id_photo_changes: used + 1,
      },
    })
  })

  await invalidateTags(cacheTags.digitalId(userId))
}

// ─── ENSURE a public share token exists, returning it ─────────────────────────
// The token is generated lazily on first share so it never leaks before the user
// opts in. randomUUID is unguessable; the @unique column guards against collisions.

export async function ensureShareToken(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { digital_id_token: true },
  })
  if (existing?.digital_id_token) return existing.digital_id_token

  const token = randomUUID()
  await prisma.user.update({
    where: { id: userId },
    data: { digital_id_token: token },
  })
  await invalidateTags(cacheTags.digitalId(userId))
  return token
}
