-- CreateEnum
CREATE TYPE "HighlightColor" AS ENUM ('YELLOW', 'ORANGE', 'GREEN', 'BLUE', 'PURPLE', 'PINK');

-- CreateTable
CREATE TABLE "Highlight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "color" "HighlightColor" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Highlight_userId_book_chapter_idx" ON "Highlight"("userId", "book", "chapter");

-- CreateIndex
CREATE UNIQUE INDEX "Highlight_userId_book_chapter_verse_key" ON "Highlight"("userId", "book", "chapter", "verse");

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
