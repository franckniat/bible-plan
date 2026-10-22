-- CreateTable
CREATE TABLE "ReadingComment" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingComment_dayId_createdAt_idx" ON "ReadingComment"("dayId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingComment_parentId_idx" ON "ReadingComment"("parentId");

-- AddForeignKey
ALTER TABLE "ReadingComment" ADD CONSTRAINT "ReadingComment_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingComment" ADD CONSTRAINT "ReadingComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingComment" ADD CONSTRAINT "ReadingComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ReadingComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
