-- CreateTable
CREATE TABLE "Mindmap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mindmap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mindmap" ADD CONSTRAINT "Mindmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
