-- AlterTable
ALTER TABLE "PrayerRequest"
ADD COLUMN     "answeredOn" DATE,
ADD COLUMN     "passages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "startedOn" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Keep what was recorded: the day a request was written, and the day it was answered.
UPDATE "PrayerRequest" SET "startedOn" = "createdAt"::date, "answeredOn" = "answeredAt"::date;

ALTER TABLE "PrayerRequest" DROP COLUMN "answeredAt";
