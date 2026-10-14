-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'OPENING_STOCK';

-- DropForeignKey
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_supplierId_fkey";

-- AlterTable
ALTER TABLE "StockBatch" ALTER COLUMN "supplierId" DROP NOT NULL,
ALTER COLUMN "invoiceNumber" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ExternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
