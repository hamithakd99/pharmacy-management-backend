import { prisma } from "../../lib/prisma";

export const generateInvoiceNumber = async (
    supplierId: number
) => {

    const supplier = await prisma.externalUser.findUnique({
        where: { id: supplierId }
    });

    if (!supplier) {
        throw new Error("Supplier not found");
    }

    const today = new Date();

    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1)
        .toString()
        .padStart(2, "0");
    const day = today.getDate()
        .toString()
        .padStart(2, "0");

    const datePart = `${year}${month}${day}`;

    const latestInvoice = await prisma.stockBatch.findFirst({
        where: {
            invoiceNumber: {
                startsWith: `PUR-${datePart}`
            }
        },
        orderBy: {
            id: "desc"
        }
    });

    let sequence = 1;

    if (latestInvoice?.invoiceNumber) {
        sequence =
            parseInt(latestInvoice.invoiceNumber.slice(-3)) + 1;
    }

    return `PUR-${datePart}-${sequence
        .toString()
        .padStart(3, "0")}`;
};