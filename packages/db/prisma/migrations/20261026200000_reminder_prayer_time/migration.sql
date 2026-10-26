-- CreateEnum
CREATE TYPE "FocusMode" AS ENUM ('NOTIFY', 'SOFT', 'STRICT');

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "focusMode" "FocusMode" NOT NULL DEFAULT 'NOTIFY',
ADD COLUMN     "leadMinutes" INTEGER NOT NULL DEFAULT 0;

