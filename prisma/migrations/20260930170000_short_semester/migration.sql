-- Semester pendek (opsional, setelah semester genap)
ALTER TABLE "Semester" ADD COLUMN "isShort" BOOLEAN NOT NULL DEFAULT false;
DROP INDEX "Semester_userId_number_key";
CREATE UNIQUE INDEX "Semester_userId_number_isShort_key" ON "Semester"("userId", "number", "isShort");
