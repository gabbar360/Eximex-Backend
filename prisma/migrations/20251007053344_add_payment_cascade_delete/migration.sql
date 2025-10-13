-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_pi_invoice_id_fkey";

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
