import { prisma } from "@/lib/prisma"

export type ClassSectionPair = { class: string; section: string }
export type GroupedClass = { class: string; sections: string[] }

/**
 * Returns distinct (class, section) pairs for active students in a school.
 * Single source of truth — wrappers in quiz.service / attendance.service delegate here.
 */
export async function getSchoolClassSections(schoolId: string): Promise<ClassSectionPair[]> {
  return prisma.student.findMany({
    where: { school_id: schoolId, status: "ACTIVE" },
    select: { class: true, section: true },
    distinct: ["class", "section"],
    orderBy: [{ class: "asc" }, { section: "asc" }],
  })
}

/**
 * Groups class-sections by class, returning `[{ class, sections: [...] }]`.
 * Used by the public /api/schools/[schoolCode]/classes endpoint and downstream UI dropdowns.
 */
export async function getGroupedSchoolClasses(schoolId: string): Promise<GroupedClass[]> {
  const pairs = await getSchoolClassSections(schoolId)
  const map = new Map<string, string[]>()
  for (const { class: klass, section } of pairs) {
    if (!map.has(klass)) map.set(klass, [])
    map.get(klass)!.push(section)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([klass, sections]) => ({ class: klass, sections: sections.sort() }))
}
