-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- Admin awal
UPDATE "User" SET "role" = 'ADMIN' WHERE lower("email") = 'christopher.124140097@student.itera.ac.id';
