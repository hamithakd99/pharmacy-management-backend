import { prisma } from "../../../lib/prisma";

export const updatePurchaseOrderStatus = async (
    purchaseOrderId: number
) => {

    // =====================================================
    // Get PO items
    // =====================================================

    const purchaseOrder =
        await prisma.purchaseOrder.findUnique({
            where: {
                id: purchaseOrderId
            },

            include: {
                items: true
            }

        });


    if (!purchaseOrder) {

        throw new Error(
            "Purchase Order not found"
        );

    }


    // =====================================================
    // Get all GRN items for this PO
    // =====================================================

    const grnItems =
        await prisma.stockBatchItem.findMany({

            where: {

                stockBatch: {

                    purchaseOrderId:
                        purchaseOrderId

                }

            },

            select: {

                purchaseOrderItemId: true,

                receivedQuantity: true

            }

        });


    // =====================================================
    // Check whether all items are completed
    // =====================================================

    let allItemsCompleted = true;


    for (
        const poItem of purchaseOrder.items
    ) {

        const totalReceived =
            grnItems
                .filter(

                    (grnItem) =>
                        grnItem.purchaseOrderItemId ===
                        poItem.id

                )
                .reduce(

                    (
                        total,
                        grnItem
                    ) =>
                        total +
                        grnItem.receivedQuantity,

                    0

                );


        if (
            totalReceived <
            poItem.quantity
        ) {

            allItemsCompleted = false;

            break;

        }

    }


    // =====================================================
    // Determine new status
    // =====================================================

    const newStatus =
        allItemsCompleted
            ? "COMPLETED"
            : "PARTIALLY_RECEIVED";


    // =====================================================
    // Update PO
    // =====================================================

    const updatedPO =
        await prisma.purchaseOrder.update({

            where: {

                id:
                    purchaseOrderId

            },

            data: {

                status:
                    newStatus

            }

        });


    return updatedPO;

};