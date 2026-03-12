-- Rename SCHOOL_ADMIN → ADMIN in Role enum
ALTER TYPE "Role" RENAME VALUE 'SCHOOL_ADMIN' TO 'ADMIN';

-- Add role column to User table (defaults to STUDENT for existing records)
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'STUDENT';

-- Fix existing teacher users to have role = TEACHER
UPDATE "User" u SET role = 'TEACHER' FROM "Teacher" t WHERE t.user_id = u.id;
