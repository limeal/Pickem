/*
  Warnings:

  - You are about to drop the column `question` on the `FormQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FormQuestion" DROP COLUMN "question",
ADD COLUMN     "answersRO" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "choices" TEXT[],
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT '';
