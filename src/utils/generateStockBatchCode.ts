import { prisma } from "../../lib/prisma";

export const generateBatchNumber = async () => {

    const today = new Date();

    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1)
        .toString()
        .padStart(2, "0");
    const day = today.getDate()
        .toString()
        .padStart(2, "0");

    const datePart = `${year}${month}${day}`;

    const latestBatch = await prisma.stockBatch.findFirst({
        where: {
            batchNumber: {
                startsWith: `BAT-${datePart}`
            }
        },
        orderBy: {
            id: "desc"
        }
    });

    let sequence = 1;

    if (latestBatch) {
        sequence =
            parseInt(latestBatch.batchNumber.slice(-4)) + 1;
    }

    return `BAT-${datePart}-${sequence
        .toString()
        .padStart(4, "0")}`;
};