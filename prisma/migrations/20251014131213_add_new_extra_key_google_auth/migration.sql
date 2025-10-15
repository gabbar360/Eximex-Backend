-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refresh_token" TEXT,
ALTER COLUMN "password" DROP NOT NULL;
