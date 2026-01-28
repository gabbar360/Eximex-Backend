/*
  Warnings:

  - You are about to drop the column `account_number` on the `CompanyDetails` table. All the data in the column will be lost.
  - You are about to drop the column `bank_address` on the `CompanyDetails` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name` on the `CompanyDetails` table. All the data in the column will be lost.
  - You are about to drop the column `ifsc_code` on the `CompanyDetails` table. All the data in the column will be lost.
  - You are about to drop the column `swift_code` on the `CompanyDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompanyDetails" DROP COLUMN "account_number",
DROP COLUMN "bank_address",
DROP COLUMN "bank_name",
DROP COLUMN "ifsc_code",
DROP COLUMN "swift_code";
