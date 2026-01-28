-- CreateTable
CREATE TABLE "bank_details" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_address" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "swift_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
