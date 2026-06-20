/*
  Warnings:

  - You are about to drop the column `category` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `Product` table. All the data in the column will be lost.
  - The primary key for the `StockBatch` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `Id` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `StockBatch` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `StockBatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `StockBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL';

-- DropForeignKey
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_supplierId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category",
DROP COLUMN "sellingPrice",
ADD COLUMN     "categoryId" INTEGER;

-- AlterTable
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_pkey",
DROP COLUMN "Id",
DROP COLUMN "stock",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL,
ADD CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ExternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
