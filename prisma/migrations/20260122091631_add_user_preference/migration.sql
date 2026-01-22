-- AlterTable
ALTER TABLE "User" ADD COLUMN     "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
ADD COLUMN     "responseLanguage" TEXT NOT NULL DEFAULT '繁體中文';
