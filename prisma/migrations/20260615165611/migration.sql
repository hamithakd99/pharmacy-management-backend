-- CreateEnum
CREATE TYPE "StrengthUnit" AS ENUM ('MG', 'ML', 'G');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "packSize" INTEGER,
ADD COLUMN     "strengthUnit" "StrengthUnit",
ADD COLUMN     "strengthValue" DOUBLE PRECISION;
