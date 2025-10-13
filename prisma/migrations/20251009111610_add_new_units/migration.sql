/*
  Warnings:

  - The values [gram] on the enum `Unit` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Unit_new" AS ENUM ('sqm', 'sqft', 'sqyd', 'acre', 'hectare', 'mm', 'cm', 'm', 'km', 'inch', 'ft', 'yd', 'mile', 'mg', 'g', 'kg', 'mt', 'lb', 'oz', 'ml', 'ltr', 'gal', 'cuft', 'cum', 'pcs', 'dozen', 'pack', 'box', 'set', 'unit');
ALTER TABLE "ItemCategory" ALTER COLUMN "primary_unit" TYPE "Unit_new" USING ("primary_unit"::text::"Unit_new");
ALTER TABLE "ItemCategory" ALTER COLUMN "secondary_unit" TYPE "Unit_new" USING ("secondary_unit"::text::"Unit_new");
ALTER TYPE "Unit" RENAME TO "Unit_old";
ALTER TYPE "Unit_new" RENAME TO "Unit";
DROP TYPE "Unit_old";
COMMIT;
