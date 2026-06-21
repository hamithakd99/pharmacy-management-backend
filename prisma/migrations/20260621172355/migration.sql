/*
  Warnings:

  - You are about to drop the column `quantity` on the `StockBatch` table. All the data in the column will be lost.
  - Added the required column `receivedQuantity` to the `StockBatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCost` to the `StockBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reorderLevel" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "StockBatch" DROP COLUMN "quantity",
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "receivedQuantity" INTEGER NOT NULL,
ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL;
