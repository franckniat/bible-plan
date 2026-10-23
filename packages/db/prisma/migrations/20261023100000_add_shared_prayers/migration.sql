-- AlterTable
ALTER TABLE "PrayerRequest" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "PrayerSupport" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerSupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrayerSupport_requestId_userId_key" ON "PrayerSupport"("requestId", "userId");

-- CreateIndex
CREATE INDEX "PrayerRequest_groupId_status_idx" ON "PrayerRequest"("groupId", "status");

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerSupport" ADD CONSTRAINT "PrayerSupport_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrayerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerSupport" ADD CONSTRAINT "PrayerSupport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
