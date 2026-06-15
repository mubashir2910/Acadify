import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cached, invalidateTags } from "@/lib/cache"
import { cacheKeys, cacheTags } from "@/lib/cache-keys"
import type {
  CreateGroupInput,
  UpdateGroupInput,
  AddClassesInput,
  ClassSectionInput,
  TimetableGroupClassRow,
  TimetableGroupRow,
} from "@/schemas/timetable-group.schema"

/** Group/class-membership changes alter both the group views and the timetable
 *  grids/student-timetable resolution, so we bust both tag families. */
function timetableGroupTags(schoolId: string) {
  return [cacheTags.timetableGroups(schoolId), cacheTags.timetable(schoolId)]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pull per-(class, section) Timetable counts for a single group. */
async function getEntryCountsForGroup(
  groupId: string,
): Promise<Map<string, number>> {
  const grouped = await prisma.timetable.groupBy({
    by: ["class", "section"],
    where: { group_id: groupId },
    _count: { _all: true },
  })
  const counts = new Map<string, number>()
  for (const row of grouped) {
    counts.set(`${row.class}__${row.section}`, row._count._all)
  }
  return counts
}

function attachEntryCounts(
  classes: { class: string; section: string }[],
  counts: Map<string, number>,
): TimetableGroupClassRow[] {
  return classes.map((c) => ({
    class: c.class,
    section: c.section,
    entry_count: counts.get(`${c.class}__${c.section}`) ?? 0,
  }))
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getGroupsForSchool(schoolId: string): Promise<TimetableGroupRow[]> {
  return cached(
    cacheKeys.timetableGroups(schoolId),
    { ttl: 900, tags: [cacheTags.timetableGroups(schoolId)] },
    () => computeGroupsForSchool(schoolId),
  )
}

async function computeGroupsForSchool(schoolId: string): Promise<TimetableGroupRow[]> {
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

  // One groupBy per group keeps the queries small; for typical schools (a few
  // groups, few classes each) this stays under 5 round-trips.
  const rows: TimetableGroupRow[] = []
  for (const g of groups) {
    const counts = await getEntryCountsForGroup(g.id)
    rows.push({
      id: g.id,
      name: g.name,
      classes: attachEntryCounts(g.classes, counts),
      period_count: g._count.periods,
      entry_count: g._count.timetables,
    })
  }
  return rows
}

export async function getGroupById(
  schoolId: string,
  groupId: string,
): Promise<TimetableGroupRow | null> {
  return cached(
    cacheKeys.timetableGroupClasses(groupId),
    { ttl: 900, tags: [cacheTags.timetableGroups(schoolId)] },
    () => computeGroupById(schoolId, groupId),
  )
}

async function computeGroupById(
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
  const counts = await getEntryCountsForGroup(group.id)
  return {
    id: group.id,
    name: group.name,
    classes: attachEntryCounts(group.classes, counts),
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
  return cached(
    cacheKeys.timetableGroupAvailableClasses(schoolId),
    { ttl: 900, tags: [cacheTags.timetableGroups(schoolId), cacheTags.classes(schoolId)] },
    () => computeSchoolClassesNotInAnyGroup(schoolId),
  )
}

async function computeSchoolClassesNotInAnyGroup(
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
  try {
    const result = await prisma.$transaction(async (tx) => {
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
        classes: input.classes.map((c) => ({ ...c, entry_count: 0 })),
        period_count: 0,
        entry_count: 0,
      }
    })
    await invalidateTags(...timetableGroupTags(schoolId))
    return result
  } catch (err) {
    // Race: another admin grabbed the same name or class between check and write.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta as { target?: string[] } | undefined)?.target?.join(",") ?? ""
      if (target.includes("name")) throw new Error("GROUP_NAME_TAKEN")
      throw new Error("CLASS_ALREADY_IN_GROUP")
    }
    throw err
  }
}

/**
 * Atomic group edit: rename + remove-classes + add-classes all in one txn.
 * Any failure rolls back every change so the group never sits in a partial state.
 *
 * Error codes (route maps these → 4xx):
 * - GROUP_NOT_FOUND, GROUP_NAME_TAKEN
 * - CLASS_NOT_IN_GROUP    — a removeClasses entry doesn't belong to this group
 * - CLASS_HAS_ENTRIES     — a removeClasses entry still has timetable assignments
 * - CLASS_ALREADY_IN_GROUP — an addClasses entry is already claimed by another group
 */
export async function updateGroup(
  schoolId: string,
  groupId: string,
  input: UpdateGroupInput,
): Promise<TimetableGroupRow> {
  const existing = await prisma.timetableGroup.findFirst({
    where: { id: groupId, school_id: schoolId },
  })
  if (!existing) throw new Error("GROUP_NOT_FOUND")

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Rename.
      if (input.name !== undefined && input.name !== existing.name) {
        const nameClash = await tx.timetableGroup.findUnique({
          where: { school_id_name: { school_id: schoolId, name: input.name } },
        })
        if (nameClash) throw new Error("GROUP_NAME_TAKEN")
        await tx.timetableGroup.update({
          where: { id: groupId },
          data: { name: input.name },
        })
      }

      // 2. Remove classes — each must belong to this group AND have zero entries.
      if (input.removeClasses && input.removeClasses.length > 0) {
        for (const c of input.removeClasses) {
          const link = await tx.timetableGroupClass.findUnique({
            where: {
              school_id_class_section: {
                school_id: schoolId,
                class: c.class,
                section: c.section,
              },
            },
          })
          if (!link || link.group_id !== groupId) {
            const err = new Error("CLASS_NOT_IN_GROUP") as Error & {
              offendingClass: ClassSectionInput
            }
            err.offendingClass = c
            throw err
          }
          const entryCount = await tx.timetable.count({
            where: { group_id: groupId, class: c.class, section: c.section },
          })
          if (entryCount > 0) {
            const err = new Error("CLASS_HAS_ENTRIES") as Error & {
              offendingClass: ClassSectionInput
              entryCount: number
            }
            err.offendingClass = c
            err.entryCount = entryCount
            throw err
          }
          await tx.timetableGroupClass.delete({ where: { id: link.id } })
        }
      }

      // 3. Add classes — none may already belong to any group.
      if (input.addClasses && input.addClasses.length > 0) {
        const conflicts = await tx.timetableGroupClass.findMany({
          where: {
            school_id: schoolId,
            OR: input.addClasses.map((c) => ({ class: c.class, section: c.section })),
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
          data: input.addClasses.map((c) => ({
            group_id: groupId,
            school_id: schoolId,
            class: c.class,
            section: c.section,
          })),
        })
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta as { target?: string[] } | undefined)?.target?.join(",") ?? ""
      if (target.includes("name")) throw new Error("GROUP_NAME_TAKEN")
      throw new Error("CLASS_ALREADY_IN_GROUP")
    }
    throw err
  }

  await invalidateTags(...timetableGroupTags(schoolId))

  const refreshed = await getGroupById(schoolId, groupId)
  if (!refreshed) throw new Error("GROUP_NOT_FOUND")
  return refreshed
}

/**
 * Cascade-deletes the group and everything attached: TimetableGroupClass rows,
 * Periods, Timetable entries, and any ClassLogs (all via FK onDelete: Cascade).
 *
 * The caller is responsible for showing a strong destructive confirmation —
 * the service no longer guards against non-empty groups.
 */
export async function deleteGroup(schoolId: string, groupId: string): Promise<void> {
  const group = await prisma.timetableGroup.findFirst({
    where: { id: groupId, school_id: schoolId },
    select: { id: true },
  })
  if (!group) throw new Error("GROUP_NOT_FOUND")
  await prisma.timetableGroup.delete({ where: { id: groupId } })
  await invalidateTags(...timetableGroupTags(schoolId))
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

  try {
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("CLASS_ALREADY_IN_GROUP")
    }
    throw err
  }

  await invalidateTags(...timetableGroupTags(schoolId))
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
  await invalidateTags(...timetableGroupTags(schoolId))
}
