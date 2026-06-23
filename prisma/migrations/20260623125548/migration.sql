/*
  Warnings:

  - You are about to drop the column `discountAmount` on the `StockBatchItem` table. All the data in the column will be lost.
  - You are about to drop the column `discountPercentage` on the `StockBatchItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StockBatch" ADD COLUMN     "invoiceDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockBatchItem" DROP COLUMN "discountAmount",
DROP COLUMN "discountPercentage";
