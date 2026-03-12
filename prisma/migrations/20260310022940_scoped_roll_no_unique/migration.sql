-- AlterTable: Add unique constraint on Student(school_id, class, section, roll_no)
CREATE UNIQUE INDEX "Student_school_id_class_section_roll_no_key" ON "Student"("school_id", "class", "section", "roll_no");
