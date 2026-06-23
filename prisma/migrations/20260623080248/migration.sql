/*
  Warnings:

  - You are about to drop the column `buyingPrice` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `expiryDate` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturingDate` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `receivedQuantity` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `totalCost` on the `StockBatch` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `StockBatch` will be added. If there are existing duplicate values, this will fail.
  - Made the column `invoiceNumber` on table `StockBatch` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_productId_fkey";

-- AlterTable
ALTER TABLE "StockBatch" DROP COLUMN "buyingPrice",
DROP COLUMN "expiryDate",
DROP COLUMN "manufacturingDate",
DROP COLUMN "paidAmount",
DROP COLUMN "productId",
DROP COLUMN "receivedQuantity",
DROP COLUMN "sellingPrice",
DROP COLUMN "totalCost",
ALTER COLUMN "invoiceNumber" SET NOT NULL;

-- CreateTable
CREATE TABLE "StockBatchItem" (
    "id" SERIAL NOT NULL,
    "stockBatchId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "buyingPrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "manufacturingDate" TIMESTAMP(3),

    CONSTRAINT "StockBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_invoiceNumber_key" ON "StockBatch"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "StockBatchItem" ADD CONSTRAINT "StockBatchItem_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatchItem" ADD CONSTRAINT "StockBatchItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
