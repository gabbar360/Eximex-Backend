-- CreateEnum
CREATE TYPE "BLStatus" AS ENUM ('DRAFT', 'ISSUED', 'SURRENDERED');

-- CreateTable
CREATE TABLE "bl_drafts" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "bl_number" TEXT NOT NULL,
    "bl_date" TIMESTAMP(3) NOT NULL,
    "number_of_original_bls" TEXT NOT NULL DEFAULT '3',
    "vessel_name" TEXT NOT NULL,
    "voyage_number" TEXT NOT NULL,
    "description_of_goods" TEXT NOT NULL,
    "marks_and_numbers" TEXT,
    "number_of_packages" TEXT NOT NULL,
    "kind_of_packages" TEXT NOT NULL DEFAULT 'CARTONS',
    "gross_weight" TEXT NOT NULL,
    "net_weight" TEXT,
    "measurement" TEXT,
    "freight_payable_at" TEXT,
    "freight_term" TEXT NOT NULL DEFAULT 'PREPAID',
    "on_board_date" TIMESTAMP(3),
    "remarks" TEXT,
    "status" "BLStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "bl_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bl_drafts_company_id_bl_number_key" ON "bl_drafts"("company_id", "bl_number");

-- AddForeignKey
ALTER TABLE "bl_drafts" ADD CONSTRAINT "bl_drafts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bl_drafts" ADD CONSTRAINT "bl_drafts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bl_drafts" ADD CONSTRAINT "bl_drafts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bl_drafts" ADD CONSTRAINT "bl_drafts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
