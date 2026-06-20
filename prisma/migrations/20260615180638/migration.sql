-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dosageForm" "DosageForm";
