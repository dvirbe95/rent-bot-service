/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TENANT', 'LANDLORD', 'AGENT');

-- AlterTable
ALTER TABLE "apartments" ADD COLUMN     "availability" JSONB,
ADD COLUMN     "calendar_link" TEXT,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "video_url" TEXT;

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TENANT',
    "current_step" TEXT NOT NULL DEFAULT 'START',
    "metadata" JSONB,
    "subscriptionStatus" BOOLEAN NOT NULL DEFAULT false,
    "planExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
