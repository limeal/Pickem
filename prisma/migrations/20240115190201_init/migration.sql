/*
  Warnings:

  - You are about to drop the column `discordId` on the `UserResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserResponse" DROP COLUMN "discordId",
ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';
