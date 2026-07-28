-- AlterTable
ALTER TABLE "StockBatchItem" ADD COLUMN     "purchaseOrderItemId" INTEGER;

-- AddForeignKey
ALTER TABLE "StockBatchItem" ADD CONSTRAINT "StockBatchItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
