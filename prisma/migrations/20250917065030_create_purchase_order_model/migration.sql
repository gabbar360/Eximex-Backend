-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "po_number" TEXT NOT NULL,
    "po_date" TIMESTAMP(3) NOT NULL,
    "delivery_date" TIMESTAMP(3),
    "ref_number" TEXT,
    "place_of_supply" TEXT,
    "company_name" TEXT,
    "company_address" TEXT,
    "company_gstin" TEXT,
    "vendor_id" INTEGER,
    "vendor_name" TEXT NOT NULL,
    "vendor_address" TEXT,
    "vendor_gstin" TEXT,
    "deliver_to_name" TEXT,
    "deliver_to_address" TEXT,
    "deliver_to_gstin" TEXT,
    "deliver_to_contact" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "cgst_rate" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "sgst_rate" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "sub_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgst_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms_conditions" TEXT,
    "signature_company" TEXT,
    "signature_title" TEXT,
    "authorized_by" TEXT,
    "status" "PoStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "item_description" TEXT NOT NULL,
    "hsn_sac" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "line_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "PartyList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
