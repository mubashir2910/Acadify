import { prisma } from "@/lib/prisma"
import type {
  CreateGroupInput,
  UpdateGroupInput,
  AddClassesInput,
  ClassSectionInput,
  TimetableGroupRow,
} from "@/schemas/timetable-group.schema"

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getGroupsForSchool(schoolId: string): Promise<TimetableGroupRow[]> {
  const groups = await prisma.timetableGroup.findMany({
    where: { school_id: schoolId },
    include: {
      classes: {
        select: { class: true, section: true },
        orderBy: [{ class: "asc" }, { section: "asc" }],
      },
      _count: { select: { periods: true, timetables: true } },
    },
    orderBy: { created_at: "asc" },
  })

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    classes: g.classes.map((c) => ({ class: c.class, section: c.section })),
    period_count: g._count.periods,
    entry_count: g._count.timetables,
  }))
}

export async function getGroupById(
  schoolId: string,
  groupId: string,
): Promise<TimetableGroupRow | null> {
  const group = await prisma.timetableGroup.findFirst({
    where: { id: groupId, school_id: schoolId },
    include: {
      classes: {
        select: { class: true, section: true },
        orderBy: [{ class: "asc" }, { section: "asc" }],
      },
      _count: { select: { periods: true, timetables: true } },
    },
  })
  if (!group) return null
  return {
    id: group.id,
    name: group.name,
    classes: group.classes.map((c) => ({ class: c.class, section: c.section })),
    period_count: group._count.periods,
    entry_count: group._count.timetables,
  }
}

/** Returns the group that owns a specific class+section, or null if unassigned. */
export async function getGroupForClass(
  schoolId: string,
  className: string,
  section: string,
): Promise<{ id: string; name: string } | null> {
  const link = await prisma.timetableGroupClass.findUnique({
    where: {
      school_id_class_section: {
        school_id: schoolId,
        class: className,
        section,
      },
    },
    include: { group: { select: { id: true, name: true } } },
  })
  return link ? { id: link.group.id, name: link.group.name } : null
}

/**
 * Returns class+section pairs that exist in this school (via active students)
 * but have not yet been claimed by any timetable group.
 */
export async function getSchoolClassesNotInAnyGroup(
  schoolId: string,
): Promise<ClassSectionInput[]> {
  const [activeClasses, claimed] = await Promise.all([
    prisma.student.findMany({
      where: { school_id: schoolId, status: "ACTIVE" },
      select: { class: true, section: true },
      distinct: ["class", "section"],
      orderBy: [{ class: "asc" }, { section: "asc" }],
    }),
    prisma.timetableGroupClass.findMany({
      where: { school_id: schoolId },
      select: { class: true, section: true },
    }),
  ])
  const claimedKey = new Set(claimed.map((c) => `${c.class}__${c.section}`))
  return activeClasses
    .filter((c) => !claimedKey.has(`${c.class}__${c.section}`))
    .map((c) => ({ class: c.class, section: c.section }))
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createGroup(
  schoolId: string,
  input: CreateGroupInput,
): Promise<TimetableGroupRow> {
  return await prisma.$transaction(async (tx) => {
    // 1. Name uniqueness inside this school.
    const nameClash = await tx.timetableGroup.findUnique({
      where: { school_id_name: { school_id: schoolId, name: input.name } },
    })
    if (nameClash) throw new Error("GROUP_NAME_TAKEN")

    // 2. None of the requested classes may already belong to another group.
    if (input.classes.length > 0) {
      const conflicts = await tx.timetableGroupClass.findMany({
        where: {
          school_id: schoolId,
          OR: input.classes.map((c) => ({ class: c.class, section: c.section })),
        },
        select: { class: true, section: true },
      })
      if (conflicts.length > 0) {
        const err = new Error("CLASS_ALREADY_IN_GROUP") as Error & {
          conflicts: ClassSectionInput[]
        }
        err.conflicts = conflicts
        throw err
      }
    }

    const group = await tx.timetableGroup.create({
      data: { school_id: schoolId, name: input.name },
    })

    if (input.classes.length > 0) {
      await tx.timetableGroupClass.createMany({
        data: input.classes.map((c) => ({
          group_id: group.id,
          school_id: schoolId,
          class: c.class,
          section: c.section,
        })),
      })
    }

    return {
      id: group.id,
      name: group.name,
      classes: input.classes,
      period_count: 0,
      entry_count: 0,
    }
  })
}

export async function updateGroup(
  schoolId: string,
  groupId: string,
  input: UpdateGroupInput,
): Promise<TimetableGroupRow> {
  const existing = await prisma.timetableGroup.findFirst({
    where: { id: groupId, school_id: schoolId },
  })
  if (!existing) throw new Error("GROUP_NOT_FOUND")

  if (input.name !== undefined && input.name !== existing.name) {
    const nameClash = await prisma.timetableGroup.findUnique({
      where: { school_id_name: { school_id: schoolId, name: input.name } },
    })
    if (nameClash) throw new Error("GROUP_NAME_TAKEN")
  }

  await prisma.timetableGroup.update({
    where: { id: groupId },
    data: { ...(input.name !== undefined && { name: input.name }) },
  })

  const refreshed = await getGroupById(schoolId, groupId)
  if (!refreshed) throw new Error("GROUP_NOT_FOUND")
  return refreshed
}

export async function deleteGroup(schoolId: string, groupId: string): Promise<void> {
  const group = await prisma.timetableGroup.findFirst({
    where: { id: groupId, school_id: schoolId },
    include: { _count: { select: { periods: true, timetables: true } } },
  })
  if (!group) throw new Error("GROUP_NOT_FOUND")
  if (group._count.periods > 0 || group._count.timetables > 0) {
    throw new Error("GROUP_NOT_EMPTY")
  }
  // Cascade will clean up TimetableGroupClass rows.
  await prisma.timetableGroup.delete({ where: { id: groupId } })
}

export async function addClassesToGroup(
  schoolId: string,
  groupId: string,
  input: AddClassesInput,
): Promise<void> {
  const group = await prisma.timetableGroup.findFirst({
    where: { id: groupId, school_id: schoolId },
    select: { id: true },
  })
  if (!group) throw new Error("GROUP_NOT_FOUND")

  await prisma.$transaction(async (tx) => {
    const conflicts = await tx.timetableGroupClass.findMany({
      where: {
        school_id: schoolId,
        OR: input.classes.map((c) => ({ class: c.class, section: c.section })),
      },
      select: { class: true, section: true },
    })
    if (conflicts.length > 0) {
      const err = new Error("CLASS_ALREADY_IN_GROUP") as Error & {
        conflicts: ClassSectionInput[]
      }
      err.conflicts = conflicts
      throw err
    }
    await tx.timetableGroupClass.createMany({
      data: input.classes.map((c) => ({
        group_id: groupId,
        school_id: schoolId,
        class: c.class,
        section: c.section,
      })),
    })
  })
}

export async function removeClassFromGroup(
  schoolId: string,
  groupId: string,
  className: string,
  section: string,
): Promise<void> {
  const link = await prisma.timetableGroupClass.findUnique({
    where: {
      school_id_class_section: {
        school_id: schoolId,
        class: className,
        section,
      },
    },
  })
  if (!link || link.group_id !== groupId) throw new Error("CLASS_NOT_IN_GROUP")

  // Reject if any timetable entries still reference this class within the group.
  const entryCount = await prisma.timetable.count({
    where: {
      group_id: groupId,
      class: className,
      section,
    },
  })
  if (entryCount > 0) throw new Error("CLASS_HAS_ENTRIES")

  await prisma.timetableGroupClass.delete({ where: { id: link.id } })
}
