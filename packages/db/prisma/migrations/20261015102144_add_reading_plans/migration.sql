-- CreateEnum
CREATE TYPE "PlanEnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ReadingPlan" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateKey" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "activeWeekdays" INTEGER[],
    "tracks" JSONB NOT NULL,
    "pace" JSONB NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "totalVerses" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "verses" INTEGER NOT NULL,

    CONSTRAINT "PlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanReading" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "track" INTEGER NOT NULL,
    "book" TEXT NOT NULL,
    "startChapter" INTEGER NOT NULL,
    "startVerse" INTEGER NOT NULL,
    "endChapter" INTEGER NOT NULL,
    "endVerse" INTEGER NOT NULL,
    "verses" INTEGER NOT NULL,

    CONSTRAINT "PlanReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEnrollment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlanEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingPlan_ownerId_idx" ON "ReadingPlan"("ownerId");

-- CreateIndex
CREATE INDEX "PlanDay_planId_date_idx" ON "PlanDay"("planId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDay_planId_dayNumber_key" ON "PlanDay"("planId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlanReading_dayId_position_key" ON "PlanReading"("dayId", "position");

-- CreateIndex
CREATE INDEX "PlanEnrollment_userId_status_idx" ON "PlanEnrollment"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEnrollment_planId_userId_key" ON "PlanEnrollment"("planId", "userId");

-- CreateIndex
CREATE INDEX "ReadingProgress_readingId_idx" ON "ReadingProgress"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_enrollmentId_readingId_key" ON "ReadingProgress"("enrollmentId", "readingId");

-- AddForeignKey
ALTER TABLE "ReadingPlan" ADD CONSTRAINT "ReadingPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDay" ADD CONSTRAINT "PlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ReadingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanReading" ADD CONSTRAINT "PlanReading_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEnrollment" ADD CONSTRAINT "PlanEnrollment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ReadingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEnrollment" ADD CONSTRAINT "PlanEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "PlanEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "PlanReading"("id") ON DELETE CASCADE ON UPDATE CASCADE;
