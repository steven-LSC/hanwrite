/*
  Warnings:

  - Added the required column `type` to the `WritingProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WritingProgress" ADD COLUMN     "type" TEXT NOT NULL;
