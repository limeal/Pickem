/*
  Warnings:

  - The primary key for the `Config` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Config` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[guildId]` on the table `Config` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guildId` to the `Config` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Config" DROP CONSTRAINT "Config_pkey",
ADD COLUMN     "guildId" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Config_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Config_guildId_key" ON "Config"("guildId");
