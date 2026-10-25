/*
  Warnings:

  - The values [OTHER] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('WHOLESALE', 'RETAIL');

-- AlterEnum
BEGIN;

CREATE TYPE "PaymentMethod_new" AS ENUM (
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'CHEQUE'
);

ALTER TABLE "Order"
ALTER COLUMN "paymentMethod"
TYPE "PaymentMethod_new"
USING (
  CASE
    WHEN "paymentMethod"::text = 'OTHER' THEN 'CHEQUE'
    ELSE "paymentMethod"::text
  END
)::"PaymentMethod_new";

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";

DROP TYPE "public"."PaymentMethod_old";

COMMIT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "saleType" "SaleType" NOT NULL DEFAULT 'WHOLESALE';

-- AlterTable
ALTER TABLE "StockBatchItem" ADD COLUMN     "retailPrice" DOUBLE PRECISION;
