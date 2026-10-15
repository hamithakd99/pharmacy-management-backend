-- CreateEnum
CREATE TYPE "StockBatchSource" AS ENUM ('PURCHASE', 'OPENING_STOCK');

-- AlterTable
ALTER TABLE "StockBatch" ADD COLUMN     "source" "StockBatchSource" NOT NULL DEFAULT 'PURCHASE';
