-- AlterTable
ALTER TABLE "user" ADD COLUMN     "bibleVersion" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr',
ADD COLUMN     "readingWpm" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN     "timezone" TEXT;
