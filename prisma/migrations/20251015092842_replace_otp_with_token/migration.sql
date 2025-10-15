/*
  Warnings:

  - You are about to drop the column `reset_password_otp` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `reset_password_otp_expiry` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "reset_password_otp",
DROP COLUMN "reset_password_otp_expiry",
ADD COLUMN     "reset_password_token" TEXT,
ADD COLUMN     "reset_password_token_expiry" TIMESTAMP(3);
