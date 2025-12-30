-- DropForeignKey
ALTER TABLE "vgm_documents" DROP CONSTRAINT "vgm_documents_pi_invoice_id_fkey";

-- AddForeignKey
ALTER TABLE "vgm_documents" ADD CONSTRAINT "vgm_documents_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
