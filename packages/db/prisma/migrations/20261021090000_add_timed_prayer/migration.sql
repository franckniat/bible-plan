-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('MEDITATION', 'PRAYER');

-- AlterTable
ALTER TABLE "MeditationSession" ADD COLUMN     "kind" "SessionKind" NOT NULL DEFAULT 'MEDITATION';

-- AlterTable
ALTER TABLE "ActivityDay" ADD COLUMN     "prayerSeconds" INTEGER NOT NULL DEFAULT 0;
