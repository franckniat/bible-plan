-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('READING', 'PRAYER', 'MEDITATION');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "localTime" VARCHAR(5) NOT NULL,
    "timezone" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "channels" "ReminderChannel"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderDelivery" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "ReminderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_enabled_nextRunAt_idx" ON "Reminder"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderDelivery_reminderId_dueAt_channel_key" ON "ReminderDelivery"("reminderId", "dueAt", "channel");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
