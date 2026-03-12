-- RenameColumns
ALTER TABLE "School" RENAME COLUMN "code" TO "schoolCode";
ALTER TABLE "School" RENAME COLUMN "name" TO "schoolName";

-- RenameIndex
ALTER INDEX "School_code_key" RENAME TO "School_schoolCode_key";
