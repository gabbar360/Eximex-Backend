/*
  Warnings:

  - You are about to drop the column `bl_number` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `booking_date` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `booking_number` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `truck_number` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `way_bill_number` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "bl_number",
DROP COLUMN "booking_date",
DROP COLUMN "booking_number",
DROP COLUMN "truck_number",
DROP COLUMN "way_bill_number";

-- CreateTable
CREATE TABLE "shipments" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "shipment_number" TEXT NOT NULL,
    "booking_number" TEXT,
    "booking_date" TIMESTAMP(3),
    "vessel_voyage_info" TEXT,
    "way_bill_number" TEXT,
    "truck_number" TEXT,
    "bl_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "shipments"("shipment_number");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
