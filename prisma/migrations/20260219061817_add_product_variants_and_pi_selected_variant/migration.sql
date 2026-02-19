-- AlterTable
ALTER TABLE "pi_products" ADD COLUMN     "selected_variant" TEXT;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "variants" TEXT[] DEFAULT ARRAY[]::TEXT[];
