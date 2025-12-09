/*
  Warnings:

  - You are about to drop the `eway_bills` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "eway_bills" DROP CONSTRAINT "eway_bills_company_id_fkey";

-- DropForeignKey
ALTER TABLE "eway_bills" DROP CONSTRAINT "eway_bills_created_by_fkey";

-- DropForeignKey
ALTER TABLE "eway_bills" DROP CONSTRAINT "eway_bills_order_id_fkey";

-- DropForeignKey
ALTER TABLE "eway_bills" DROP CONSTRAINT "eway_bills_updated_by_fkey";

-- DropTable
DROP TABLE "eway_bills";

-- DropEnum
DROP TYPE "EwayBillStatus";
