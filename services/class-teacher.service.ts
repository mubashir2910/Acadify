import { prisma } from "@/lib/prisma"

// ─── Get admin's school ID from their user ID ──────────────────────────────

export async function getAdminSchoolId(userId: string): Promise<string | null> {
  const schoolUser = await prisma.schoolUser.findFirst({
    where: { user_id: userId, role: "ADMIN" },
    select: { school_id: true },
  })
  return schoolUser?.school_id ?? null
}

// ─── List all class-teacher assignments for a school ────────────────────────

export async function getClassTeacherAssignments(schoolId: string) {
  return prisma.classTeacher.findMany({
    where: { school_id: schoolId },
    select: {
      id: true,
      class: true,
      section: true,
      assigned_at: true,
      teacher: {
        select: {
          id: true,
          employee_id: true,
          status: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [{ class: "asc" }, { section: "asc" }],
  })
}

// ─── Get available (unassigned) teachers for this school ────────────────────

export async function getAvailableTeachers(schoolId: string) {
  return prisma.teacher.findMany({
    where: {
      school_id: schoolId,
      status: "ACTIVE",
      classTeacher: null,
    },
    select: {
      id: true,
      employee_id: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  })
}

// ─── Get available (unassigned) class-sections for this school ──────────────

export async function getAvailableClassSections(schoolId: string) {
  const allClassSections = await prisma.student.findMany({
    where: { school_id: schoolId, status: "ACTIVE" },
    select: { class: true, section: true },
    distinct: ["class", "section"],
    orderBy: [{ class: "asc" }, { section: "asc" }],
  })

  const assignedClassSections = await prisma.classTeacher.findMany({
    where: { school_id: schoolId },
    select: { class: true, section: true },
  })

  const assignedSet = new Set(
    assignedClassSections.map((a) => `${a.class}|${a.section}`)
  )

  return allClassSections.filter(
    (cs) => !assignedSet.has(`${cs.class}|${cs.section}`)
  )
}

// ─── Get assigned class-sections (for the "Change" flow) ────────────────────

export async function getAssignedClassSections(schoolId: string) {
  return prisma.classTeacher.findMany({
    where: { school_id: schoolId },
    select: {
      class: true,
      section: true,
      teacher: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [{ class: "asc" }, { section: "asc" }],
  })
}

// ─── Assign a class teacher ─────────────────────────────────────────────────

export async function assignClassTeacher(
  schoolId: string,
  teacherId: string,
  className: string,
  section: string
) {
  // All checks + insert run inside a transaction so concurrent requests can't
  // both pass the duplicate check and race to create the same assignment.
  return prisma.$transaction(async (tx) => {
    // Verify teacher belongs to this school and is active
    const teacher = await tx.teacher.findFirst({
      where: { id: teacherId, school_id: schoolId, status: "ACTIVE" },
    })
    if (!teacher) throw new Error("TEACHER_NOT_FOUND")

    // Check if teacher is already assigned as class teacher
    const existingTeacherAssignment = await tx.classTeacher.findUnique({
      where: { teacher_id: teacherId },
    })
    if (existingTeacherAssignment) throw new Error("TEACHER_ALREADY_ASSIGNED")

    // Check if class-section already has a class teacher
    const existingClassAssignment = await tx.classTeacher.findUnique({
      where: {
        school_id_class_section: {
          school_id: schoolId,
          class: className,
          section: section,
        },
      },
    })
    if (existingClassAssignment) throw new Error("CLASS_ALREADY_ASSIGNED")

    return tx.classTeacher.create({
      data: {
        school_id: schoolId,
        teacher_id: teacherId,
        class: className,
        section: section,
      },
    })
  })
}

// ─── Change the class teacher for a class-section ───────────────────────────

export async function changeClassTeacher(
  schoolId: string,
  className: string,
  section: string,
  newTeacherId: string
) {
  // All checks + update run inside a transaction so concurrent requests can't
  // both pass the duplicate check and race to assign the same teacher twice.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.classTeacher.findUnique({
      where: {
        school_id_class_section: {
          school_id: schoolId,
          class: className,
          section: section,
        },
      },
    })
    if (!existing) throw new Error("ASSIGNMENT_NOT_FOUND")

    // Verify new teacher belongs to this school and is active
    const newTeacher = await tx.teacher.findFirst({
      where: { id: newTeacherId, school_id: schoolId, status: "ACTIVE" },
    })
    if (!newTeacher) throw new Error("TEACHER_NOT_FOUND")

    // Check new teacher is not already assigned elsewhere
    const newTeacherAssignment = await tx.classTeacher.findUnique({
      where: { teacher_id: newTeacherId },
    })
    if (newTeacherAssignment) throw new Error("TEACHER_ALREADY_ASSIGNED")

    return tx.classTeacher.update({
      where: { id: existing.id },
      data: {
        teacher_id: newTeacherId,
        assigned_at: new Date(),
      },
    })
  })
}

// ─── Get class teacher for a student's class+section ────────────────────────

export async function getClassTeacherForStudent(
  schoolId: string,
  className: string,
  section: string
) {
  return prisma.classTeacher.findUnique({
    where: {
      school_id_class_section: {
        school_id: schoolId,
        class: className,
        section: section,
      },
    },
    select: {
      teacher: {
        select: {
          employee_id: true,
          user: { select: { name: true } },
        },
      },
    },
  })
}

// ─── Get teacher's assigned class with student list ─────────────────────────

export async function getTeacherClassWithStudents(userId: string) {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: userId },
    select: {
      id: true,
      school_id: true,
      classTeacher: { select: { class: true, section: true } },
    },
  })
  if (!teacher) return null

  if (!teacher.classTeacher) {
    return { assigned: false as const }
  }

  const { class: className, section } = teacher.classTeacher

  const students = await prisma.student.findMany({
    where: {
      school_id: teacher.school_id,
      class: className,
      section: section,
      status: "ACTIVE",
    },
    select: {
      roll_no: true,
      house_name: true,
      user: {
        select: {
          username: true,
          name: true,
          profile_picture: true,
        },
      },
    },
    orderBy: { roll_no: "asc" },
  })

  return {
    assigned: true as const,
    class: className,
    section,
    students,
  }
}

// ─── Get class teacher name for a student ───────────────────────────────────

export async function getStudentClassTeacher(userId: string) {
  const student = await prisma.student.findFirst({
    where: { user_id: userId },
    select: { school_id: true, class: true, section: true },
  })
  if (!student) return null

  const ct = await getClassTeacherForStudent(
    student.school_id,
    student.class,
    student.section
  )

  // Fetch classmates in the same class+section (excluding sensitive data like phone)
  const classmates = await prisma.student.findMany({
    where: {
      school_id: student.school_id,
      class: student.class,
      section: student.section,
      status: "ACTIVE",
    },
    select: {
      roll_no: true,
      user: {
        select: {
          name: true,
          profile_picture: true,
        },
      },
    },
    orderBy: { roll_no: "asc" },
  })

  return {
    class: student.class,
    section: student.section,
    teacherName: ct?.teacher.user.name ?? null,
    classmates: classmates.map((c) => ({
      name: c.user.name,
      rollNo: c.roll_no,
      profilePicture: c.user.profile_picture,
    })),
  }
}
