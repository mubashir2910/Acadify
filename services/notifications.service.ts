import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  CreateNotificationInput,
  NotificationItem,
  NotificationListResponse,
} from "@/schemas/notifications.schema"

// ─── Typed error strings ────────────────────────────────────────────────────────
// All errors thrown by this service are plain strings so API routes can map them
// to HTTP status codes without inspecting Prisma internals.
type ServiceError =
  | "SCHOOL_NOT_FOUND"
  | "NOTIFICATION_NOT_FOUND"
  | "SECTION_WITHOUT_CLASS"
  | "FORBIDDEN"

function fail(code: ServiceError): never {
  throw code
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Resolves the school_id for any role:
 * - ADMIN / TEACHER: look up SchoolUser
 * - STUDENT: look up Student record (active status)
 */
async function resolveSchoolId(userId: string, role: string): Promise<string> {
  if (role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { user_id: userId, status: "ACTIVE" },
      select: { school_id: true },
    })
    if (!student) fail("SCHOOL_NOT_FOUND")
    return student.school_id
  }

  // ADMIN or TEACHER
  const schoolUser = await prisma.schoolUser.findFirst({
    where: { user_id: userId, status: "ACTIVE" },
    select: { school_id: true },
  })
  if (!schoolUser) fail("SCHOOL_NOT_FOUND")
  return schoolUser.school_id
}

/**
 * Builds the Prisma WHERE clause that determines which notifications are visible
 * to the given user based on their role, class, and section.
 *
 * NOTE: created_by is nullable (SetNull on creator deletion). Notifications from
 * deleted creators (created_by: null) are excluded from inboxes via NOT, which
 * is acceptable since they cannot be attributed to anyone.
 */
async function buildVisibilityWhere(
  userId: string,
  role: string
): Promise<Prisma.NotificationWhereInput> {
  if (role === "ADMIN") {
    const schoolUser = await prisma.schoolUser.findFirst({
      where: { user_id: userId, status: "ACTIVE" },
      select: { school_id: true },
    })
    if (!schoolUser) return { id: { equals: "" } } // no school → empty result
    // Exclude own notifications — those belong in "Created by Me", not Inbox
    return {
      school_id: schoolUser.school_id,
      NOT: { created_by: userId },
    }
  }

  if (role === "TEACHER") {
    const schoolUser = await prisma.schoolUser.findFirst({
      where: { user_id: userId, status: "ACTIVE" },
      select: { school_id: true },
    })
    if (!schoolUser) return { id: { equals: "" } }
    return {
      school_id: schoolUser.school_id,
      // Teachers see ALL-audience or TEACHER-audience notifications.
      // No class filter: subject teachers may teach any class and we don't
      // track teacher-class mappings, so all teachers in the school see
      // notifications targeted at teachers.
      target_audience: { in: ["ALL", "TEACHER"] },
      // Exclude own notifications — those belong in "Created by Me", not Inbox
      NOT: { created_by: userId },
    }
  }

  // STUDENT
  const student = await prisma.student.findFirst({
    where: { user_id: userId, status: "ACTIVE" },
    select: { school_id: true, class: true, section: true },
  })
  if (!student) return { id: { equals: "" } } // no active record → empty

  return {
    school_id: student.school_id,
    target_audience: { in: ["ALL", "STUDENT"] },
    AND: [
      // Class filter: null means school-wide (all classes)
      { OR: [{ target_class: null }, { target_class: student.class }] },
      // Section filter: null means all sections within the targeted class
      { OR: [{ target_section: null }, { target_section: student.section }] },
    ],
  }
}

// ─── Exported service functions ─────────────────────────────────────────────────

export async function createNotification(
  userId: string,
  role: string,
  input: CreateNotificationInput
): Promise<{ id: string }> {
  // section without class is invalid targeting
  if (input.target_section !== null && input.target_class === null) {
    fail("SECTION_WITHOUT_CLASS")
  }

  const schoolId = await resolveSchoolId(userId, role)

  const notification = await prisma.notification.create({
    data: {
      school_id: schoolId,
      created_by: userId,
      title: input.title.trim(),
      message: input.message.trim(),
      target_audience: input.target_audience,
      target_class: input.target_class,
      target_section: input.target_section,
    },
    select: { id: true },
  })

  return { id: notification.id }
}

export async function getNotificationsForUser(
  userId: string,
  role: string,
  page: number,
  limit: number
): Promise<NotificationListResponse> {
  const where = await buildVisibilityWhere(userId, role)

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        target_audience: true,
        target_class: true,
        target_section: true,
        created_at: true,
        created_by: true,
        // creator is nullable — creator?.name falls back to "Deleted User"
        creator: { select: { name: true } },
        reads: {
          where: { user_id: userId },
          select: { id: true },
        },
      },
    }),
  ])

  type NotificationRow = (typeof notifications)[number]
  const items: NotificationItem[] = notifications.map((n: NotificationRow) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    target_audience: n.target_audience,
    target_class: n.target_class,
    target_section: n.target_section,
    created_at: n.created_at.toISOString(),
    created_by_name: n.creator?.name ?? null,
    created_by_id: n.created_by,
    is_read: n.reads.length > 0,
  }))

  return { notifications: items, total, page, limit }
}

export async function getNotificationsCreatedByUser(
  userId: string,
  role: string,
  page: number,
  limit: number
): Promise<NotificationListResponse> {
  const schoolId = await resolveSchoolId(userId, role)

  const where = { school_id: schoolId, created_by: userId }

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        target_audience: true,
        target_class: true,
        target_section: true,
        created_at: true,
        created_by: true,
        creator: { select: { name: true } },
      },
    }),
  ])

  type CreatedRow = (typeof notifications)[number]
  const items: NotificationItem[] = notifications.map((n: CreatedRow) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    target_audience: n.target_audience,
    target_class: n.target_class,
    target_section: n.target_section,
    created_at: n.created_at.toISOString(),
    created_by_name: n.creator?.name ?? null,
    created_by_id: n.created_by,
    // Creator is always considered to have seen their own notification
    is_read: true,
  }))

  return { notifications: items, total, page, limit }
}

export async function markAsRead(
  notificationId: string,
  userId: string,
  role: string
): Promise<void> {
  // Verify the notification exists AND is visible to this user (school-scoped)
  const visibilityWhere = await buildVisibilityWhere(userId, role)
  const notification = await prisma.notification.findFirst({
    where: { AND: [{ id: notificationId }, visibilityWhere] },
    select: { id: true },
  })
  if (!notification) fail("NOTIFICATION_NOT_FOUND")

  // Upsert is idempotent — safe to call multiple times
  await prisma.notificationRead.upsert({
    where: {
      notification_id_user_id: {
        notification_id: notificationId,
        user_id: userId,
      },
    },
    create: { notification_id: notificationId, user_id: userId },
    update: {}, // already read — no-op
  })
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
  role: string
): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId },
    select: { id: true, created_by: true, school_id: true },
  })
  if (!notification) fail("NOTIFICATION_NOT_FOUND")

  if (role === "TEACHER") {
    // Teachers can only delete their own notifications
    if (notification.created_by !== userId) fail("FORBIDDEN")
  } else if (role === "ADMIN") {
    // Admin can delete any notification in their school
    const schoolUser = await prisma.schoolUser.findFirst({
      where: { user_id: userId, school_id: notification.school_id, status: "ACTIVE" },
      select: { id: true },
    })
    if (!schoolUser) fail("FORBIDDEN")
  } else {
    fail("FORBIDDEN")
  }

  // Cascade on NotificationRead is handled by onDelete: Cascade in schema
  await prisma.notification.delete({ where: { id: notificationId } })
}

export async function getUnreadCount(
  userId: string,
  role: string
): Promise<number> {
  const where = await buildVisibilityWhere(userId, role)

  // Single-pass: count visible notifications and how many the user has read,
  // using relation filters to avoid loading IDs into memory.
  const [visibleCount, readCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notificationRead.count({
      where: {
        user_id: userId,
        notification: where,
      },
    }),
  ])

  return Math.max(0, visibleCount - readCount)
}
