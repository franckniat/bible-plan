-- CreateTable
CREATE TABLE "MeditationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passage" TEXT,
    "plannedSeconds" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeditationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeditationSession_userId_startedAt_idx" ON "MeditationSession"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "MeditationSession" ADD CONSTRAINT "MeditationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
