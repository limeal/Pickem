/*
  Warnings:

  - You are about to drop the column `name` on the `Form` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Form" DROP COLUMN "name",
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';
