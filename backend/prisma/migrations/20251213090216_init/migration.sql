/*
  Warnings:

  - A unique constraint covering the columns `[turbineId,date]` on the table `Inspection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Finding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Inspection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RepairPlan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Finding" DROP CONSTRAINT "Finding_inspectionId_fkey";

-- DropForeignKey
ALTER TABLE "Inspection" DROP CONSTRAINT "Inspection_turbineId_fkey";

-- DropForeignKey
ALTER TABLE "RepairPlan" DROP CONSTRAINT "RepairPlan_inspectionId_fkey";

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "RepairPlan" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_turbineId_date_key" ON "Inspection"("turbineId", "date");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_turbineId_fkey" FOREIGN KEY ("turbineId") REFERENCES "Turbine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPlan" ADD CONSTRAINT "RepairPlan_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
