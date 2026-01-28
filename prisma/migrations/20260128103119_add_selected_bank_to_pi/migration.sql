-- AlterTable
ALTER TABLE "pi_invoice" ADD COLUMN     "selected_bank_id" INTEGER;

-- AddForeignKey
ALTER TABLE "pi_invoice" ADD CONSTRAINT "pi_invoice_selected_bank_id_fkey" FOREIGN KEY ("selected_bank_id") REFERENCES "bank_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;
