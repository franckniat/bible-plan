-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ACHIEVEMENT';

-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "seenAt" TIMESTAMP(3);

-- The achievements recorded before the celebration existed are not celebrated.
UPDATE "Achievement" SET "seenAt" = "createdAt";
