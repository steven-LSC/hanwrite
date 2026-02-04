-- CreateTable
CREATE TABLE "WritingProgress" (
    "id" TEXT NOT NULL,
    "writingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "characterCount" INTEGER NOT NULL,

    CONSTRAINT "WritingProgress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WritingProgress" ADD CONSTRAINT "WritingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingProgress" ADD CONSTRAINT "WritingProgress_writingId_fkey" FOREIGN KEY ("writingId") REFERENCES "Writing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
