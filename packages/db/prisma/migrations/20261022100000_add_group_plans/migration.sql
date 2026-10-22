-- AlterTable
ALTER TABLE "ReadingPlan" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "ReadingPlan_groupId_idx" ON "ReadingPlan"("groupId");

-- AddForeignKey
ALTER TABLE "ReadingPlan" ADD CONSTRAINT "ReadingPlan_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
