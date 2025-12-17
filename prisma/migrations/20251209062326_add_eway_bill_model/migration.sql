-- CreateEnum
CREATE TYPE "EwayBillStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "eway_bills" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "eway_bill_number" TEXT NOT NULL,
    "eway_bill_date" TIMESTAMP(3) NOT NULL,
    "valid_upto" TIMESTAMP(3) NOT NULL,
    "transporter_id" TEXT,
    "transporter_name" TEXT,
    "transport_mode" TEXT NOT NULL DEFAULT '1',
    "vehicle_number" TEXT,
    "vehicle_type" TEXT NOT NULL DEFAULT 'R',
    "from_gstin" TEXT NOT NULL,
    "from_trade_name" TEXT NOT NULL,
    "from_address" TEXT,
    "from_place" TEXT NOT NULL,
    "from_pincode" TEXT NOT NULL,
    "from_state_code" TEXT NOT NULL,
    "to_gstin" TEXT NOT NULL,
    "to_trade_name" TEXT NOT NULL,
    "to_address" TEXT,
    "to_place" TEXT NOT NULL,
    "to_pincode" TEXT NOT NULL,
    "to_state_code" TEXT NOT NULL,
    "total_value" DOUBLE PRECISION NOT NULL,
    "cgst_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cess_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_invoice_value" DOUBLE PRECISION NOT NULL,
    "transaction_type" INTEGER NOT NULL DEFAULT 1,
    "sub_supply_type" INTEGER NOT NULL DEFAULT 1,
    "doc_type" TEXT NOT NULL DEFAULT 'INV',
    "doc_number" TEXT NOT NULL,
    "doc_date" TIMESTAMP(3) NOT NULL,
    "status" "EwayBillStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "api_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "eway_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eway_bills_order_id_key" ON "eway_bills"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "eway_bills_eway_bill_number_key" ON "eway_bills"("eway_bill_number");

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
