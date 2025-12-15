/*
  Warnings:

  - Added the required column `created_by` to the `tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('LEAD_FOLLOW_UP', 'QUOTATION', 'DOCUMENTATION', 'SHIPMENT', 'PAYMENT', 'INTERNAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "TaskStatus" ADD VALUE 'OVERDUE';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "created_by" INTEGER NOT NULL,
ADD COLUMN     "escalated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lead_id" INTEGER,
ADD COLUMN     "project_id" INTEGER,
ADD COLUMN     "sla_hours" INTEGER,
ADD COLUMN     "type" "TaskType" NOT NULL;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
