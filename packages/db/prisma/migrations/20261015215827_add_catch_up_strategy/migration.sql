-- CreateEnum
CREATE TYPE "CatchUpStrategy" AS ENUM ('SHIFT', 'REDISTRIBUTE', 'FREE');

-- AlterTable
ALTER TABLE "ReadingPlan" ADD COLUMN     "catchUpStrategy" "CatchUpStrategy" NOT NULL DEFAULT 'SHIFT';
