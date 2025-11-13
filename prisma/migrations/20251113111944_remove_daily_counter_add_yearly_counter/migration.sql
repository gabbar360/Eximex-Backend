/*
  Warnings:

  - You are about to drop the `pi_daily_counters` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "pi_daily_counters";

-- CreateTable
CREATE TABLE "pi_yearly_counters" (
    "id" SERIAL NOT NULL,
    "financial_year" TEXT NOT NULL,
    "last_incremental_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pi_yearly_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pi_yearly_counters_financial_year_key" ON "pi_yearly_counters"("financial_year");
