-- CreateEnum
CREATE TYPE "ContactStage" AS ENUM ('NEW', 'QUALIFIED', 'NEGOTIATION', 'QUOTATION_SENT', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "PartyList" ADD COLUMN     "stage" "ContactStage" NOT NULL DEFAULT 'NEW';
