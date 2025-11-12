/*
  Warnings:

  - You are about to drop the `product_packaging_steps` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_packaging_steps" DROP CONSTRAINT "product_packaging_steps_category_id_fkey";

-- DropForeignKey
ALTER TABLE "product_packaging_steps" DROP CONSTRAINT "product_packaging_steps_created_by_fkey";

-- DropForeignKey
ALTER TABLE "product_packaging_steps" DROP CONSTRAINT "product_packaging_steps_order_id_fkey";

-- DropForeignKey
ALTER TABLE "product_packaging_steps" DROP CONSTRAINT "product_packaging_steps_packaging_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "product_packaging_steps" DROP CONSTRAINT "product_packaging_steps_pi_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "product_packaging_steps" DROP CONSTRAINT "product_packaging_steps_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_packaging_steps" DROP CONSTRAINT "product_packaging_steps_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "vgm_documents" DROP CONSTRAINT "vgm_documents_product_packaging_step_id_fkey";

-- DropTable
DROP TABLE "product_packaging_steps";

-- CreateTable
CREATE TABLE "packing_lists" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "pi_invoice_id" INTEGER,
    "order_id" INTEGER,
    "category_id" INTEGER,
    "step_number" INTEGER NOT NULL,
    "step_type" "PackagingStepType" NOT NULL DEFAULT 'PACKING',
    "description" TEXT NOT NULL,
    "packaging_unit_id" INTEGER,
    "quantity" DOUBLE PRECISION,
    "material" TEXT,
    "weight" DOUBLE PRECISION,
    "weight_unit" TEXT DEFAULT 'kg',
    "dimensions" JSONB,
    "container_number" TEXT,
    "seal_type" TEXT,
    "seal_number" TEXT,
    "notes" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "packing_lists_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_packaging_unit_id_fkey" FOREIGN KEY ("packaging_unit_id") REFERENCES "packaging_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vgm_documents" ADD CONSTRAINT "vgm_documents_product_packaging_step_id_fkey" FOREIGN KEY ("product_packaging_step_id") REFERENCES "packing_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
