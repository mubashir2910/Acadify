-- DropForeignKey
ALTER TABLE "SchoolUser" DROP CONSTRAINT "SchoolUser_school_id_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_school_id_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_school_id_fkey";

-- AddForeignKey
ALTER TABLE "SchoolUser" ADD CONSTRAINT "SchoolUser_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
