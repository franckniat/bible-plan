-- CreateTable
CREATE TABLE "SyncPurge" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "upTo" BIGINT NOT NULL,

    CONSTRAINT "SyncPurge_pkey" PRIMARY KEY ("id")
);
