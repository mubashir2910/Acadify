/**
 * Backfills `TimetableGroup` and `TimetableGroupClass` rows for every school
 * that already has Periods or Timetable entries before the multi-group rollout.
 *
 * Safe to re-run — idempotent on the "Default" group name and on already-linked rows.
 *
 * Usage: `npx tsx prisma/backfill-timetable-groups.ts`
 */
import "dotenv/config"
import { prisma } from "../lib/prisma"

const DEFAULT_GROUP_NAME = "Default"

async function main() {
  console.log("🔍 Scanning schools with existing timetable data…")

  const schoolsWithPeriods = await prisma.period.findMany({
    where: { group_id: null },
    select: { school_id: true },
    distinct: ["school_id"],
  })

  const schoolsWithTimetables = await prisma.timetable.findMany({
    where: { group_id: null },
    select: { school_id: true },
    distinct: ["school_id"],
  })

  const schoolIds = new Set<string>([
    ...schoolsWithPeriods.map((r) => r.school_id),
    ...schoolsWithTimetables.map((r) => r.school_id),
  ])

  if (schoolIds.size === 0) {
    console.log("✅ No schools need backfilling.")
    return
  }

  console.log(`📦 Found ${schoolIds.size} school(s) to backfill.`)

  for (const schoolId of schoolIds) {
    await prisma.$transaction(async (tx) => {
      // 1. Get or create the Default group for this school.
      let group = await tx.timetableGroup.findUnique({
        where: { school_id_name: { school_id: schoolId, name: DEFAULT_GROUP_NAME } },
      })
      if (!group) {
        group = await tx.timetableGroup.create({
          data: { school_id: schoolId, name: DEFAULT_GROUP_NAME },
        })
        console.log(`  + Created "Default" group for school ${schoolId}`)
      }

      // 2. Pull every distinct (class, section) from existing Timetable rows so
      //    students/teachers can look them up after migration.
      const classSections = await tx.timetable.findMany({
        where: { school_id: schoolId },
        select: { class: true, section: true },
        distinct: ["class", "section"],
      })

      for (const { class: cls, section } of classSections) {
        // upsert prevents duplicate rows on re-run.
        await tx.timetableGroupClass.upsert({
          where: {
            school_id_class_section: {
              school_id: schoolId,
              class: cls,
              section,
            },
          },
          update: {}, // already claimed (perhaps by a different group) → leave alone
          create: {
            group_id: group.id,
            school_id: schoolId,
            class: cls,
            section,
          },
        })
      }

      // 3. Backfill group_id on Periods + Timetable rows that still have NULL.
      const updatedPeriods = await tx.period.updateMany({
        where: { school_id: schoolId, group_id: null },
        data: { group_id: group.id },
      })
      const updatedEntries = await tx.timetable.updateMany({
        where: { school_id: schoolId, group_id: null },
        data: { group_id: group.id },
      })
      console.log(
        `  → school ${schoolId}: ${updatedPeriods.count} periods, ${updatedEntries.count} timetable entries linked, ${classSections.length} class-sections registered`,
      )
    })
  }

  console.log("✅ Backfill complete.")
}

main()
  .catch((err) => {
    console.error("❌ Backfill failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
