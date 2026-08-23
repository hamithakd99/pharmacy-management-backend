import { prisma } from "../../../lib/prisma";

type GRNItemInput = {
    productId: number;
    purchaseOrderItemId: number;
    receivedQuantity: number;
};

export const validateGRNItems = async (
    purchaseOrderId: number,
    items: GRNItemInput[]
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

        return {
            valid: false,
            message: "Purchase Order not found"
        };

    }


    // =====================================================
    // Get previous GRN quantities
    // =====================================================

    const previousGRNItems =
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
    // Calculate incoming quantities
    //
    // Important:
    // If same PO item appears twice in one GRN,
    // combine both quantities.
    // =====================================================

    const incomingQuantities =
        new Map<number, number>();


    for (const item of items) {

        const purchaseOrderItemId =
            Number(
                item.purchaseOrderItemId
            );

        const receivedQuantity =
            Number(
                item.receivedQuantity
            );


        const current =
            incomingQuantities.get(
                purchaseOrderItemId
            ) ?? 0;


        incomingQuantities.set(

            purchaseOrderItemId,

            current +
            receivedQuantity

        );

    }


    // =====================================================
    // Validate each PO item
    // =====================================================

    for (
        const [
            purchaseOrderItemId,
            incomingQuantity
        ]
        of incomingQuantities
    ) {

        // -------------------------------------------------
        // Find PO item
        // -------------------------------------------------

        const poItem =
            purchaseOrder.items.find(

                (item) =>
                    item.id ===
                    purchaseOrderItemId

            );


        if (!poItem) {

            return {

                valid: false,

                message:
                    "GRN item does not belong to this Purchase Order"

            };

        }


        // -------------------------------------------------
        // Already received
        // -------------------------------------------------

        const alreadyReceived =
            previousGRNItems
                .filter(

                    (grnItem) =>
                        grnItem.purchaseOrderItemId ===
                        purchaseOrderItemId

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


        // -------------------------------------------------
        // Remaining
        // -------------------------------------------------

        const remainingQuantity =
            Math.max(

                poItem.quantity -
                alreadyReceived,

                0

            );


        // -------------------------------------------------
        // Cannot receive 0
        // -------------------------------------------------

        if (
            incomingQuantity <= 0
        ) {

            return {

                valid: false,

                message:
                    "Received quantity must be greater than 0"

            };

        }


        // -------------------------------------------------
        // Cannot exceed remaining
        // -------------------------------------------------

        if (
            incomingQuantity >
            remainingQuantity
        ) {

            return {

                valid: false,

                message:
                    `Only ${remainingQuantity} units remaining for this product.`

            };

        }

    }


    return {

        valid: true,

        message: null

    };

};