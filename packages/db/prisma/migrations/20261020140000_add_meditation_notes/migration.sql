-- CreateTable
CREATE TABLE "MeditationNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "passage" TEXT NOT NULL,
    "keyVerse" TEXT,
    "reflection" TEXT,
    "application" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeditationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeditationNote_userId_book_updatedAt_idx" ON "MeditationNote"("userId", "book", "updatedAt");

-- CreateIndex
CREATE INDEX "MeditationNote_userId_updatedAt_idx" ON "MeditationNote"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "MeditationNote" ADD CONSTRAINT "MeditationNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeditationNote" ADD CONSTRAINT "MeditationNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MeditationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
