-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "UserResponse" ADD COLUMN     "channelId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "currentQuestion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "Config" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL DEFAULT '',
    "formChannelId" TEXT NOT NULL DEFAULT '',
    "formCategory" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);
