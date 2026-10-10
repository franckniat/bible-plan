-- CreateTable
CREATE TABLE "EmailDailyUsage" (
    "day" DATE NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDailyUsage_pkey" PRIMARY KEY ("day")
);
