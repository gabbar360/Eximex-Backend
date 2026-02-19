/*
  Warnings:

  - You are about to drop the column `selected_variant` on the `pi_products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pi_products" DROP COLUMN "selected_variant",
ADD COLUMN     "selected_variants" JSONB;
