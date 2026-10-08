-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_stockBatchItemId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_stockBatchItemId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "stockBatchItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "stockBatchItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_stockBatchItemId_fkey" FOREIGN KEY ("stockBatchItemId") REFERENCES "StockBatchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockBatchItemId_fkey" FOREIGN KEY ("stockBatchItemId") REFERENCES "StockBatchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
