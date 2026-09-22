-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_cashierId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "cashierId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
