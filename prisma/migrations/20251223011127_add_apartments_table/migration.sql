/*
  Warnings:

  - You are about to drop the column `images` on the `apartments` table. All the data in the column will be lost.
  - You are about to drop the column `landlord_id` on the `apartments` table. All the data in the column will be lost.
  - Added the required column `phone_number` to the `apartments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- 1. קודם כל מפעילים את התוסף
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. עכשיו אפשר לבצע שינויים בטבלה שמשתמשים ב-vector
ALTER TABLE "apartments" DROP COLUMN "images",
DROP COLUMN "landlord_id",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "embedding" vector(768),
ADD COLUMN     "phone_number" TEXT NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;