/*
  Warnings:

  - You are about to drop the `bl_drafts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bl_drafts" DROP CONSTRAINT "bl_drafts_company_id_fkey";

-- DropForeignKey
ALTER TABLE "bl_drafts" DROP CONSTRAINT "bl_drafts_created_by_fkey";

-- DropForeignKey
ALTER TABLE "bl_drafts" DROP CONSTRAINT "bl_drafts_order_id_fkey";

-- DropForeignKey
ALTER TABLE "bl_drafts" DROP CONSTRAINT "bl_drafts_updated_by_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "bl_number" TEXT;

-- DropTable
DROP TABLE "bl_drafts";

-- DropEnum
DROP TYPE "BLStatus";
