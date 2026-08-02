import { prisma } from "../../lib/prisma";

export const generatePOcode = async () => {

    const today = new Date();

    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1)
        .toString()
        .padStart(2, "0");
    const day = today.getDate()
        .toString()
        .padStart(2, "0");

    const datePart = `${year}${month}${day}`;

    const latestPO = await prisma.purchaseOrder.findFirst({
        where: {
            orderNumber: {
                startsWith: `PO-${datePart}`
            }
        },
        orderBy: {
            id: "desc"
        }
    });

    let sequence = 1;

    if (latestPO) {
        sequence = parseInt(latestPO.orderNumber.slice(-4)) + 1;
    }

    const sequenceStr = sequence.toString().padStart(4, "0");

    return `PO-${datePart}-${sequenceStr}`;
};