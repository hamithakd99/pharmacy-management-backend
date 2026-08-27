import { prisma } from "../../../lib/prisma";
import { calculatePOItems } from "./calculatePOItems.service";
import { calculatePOSummary } from "./calculatePOSummary.service";
import { getGRNHistory } from "./getGRNHistory.service";

export const getPurchaseOrderDetails =
    async (
        purchaseOrderId: number
    ) => {

        console.log(
            "========== GET PO DETAILS =========="
        );

        console.log(
            "Purchase Order ID:",
            purchaseOrderId
        );

        // =====================================================
        // GET PURCHASE ORDER
        // =====================================================

        const purchaseOrder =
            await prisma.purchaseOrder.findUnique({

                where: {

                    id:
                        purchaseOrderId

                },

                include: {

                    // -------------------------------------------------
                    // SUPPLIER
                    // -------------------------------------------------

                    supplier: true,


                    // -------------------------------------------------
                    // ORIGINAL PO ITEMS
                    // -------------------------------------------------

                    items: {

                        include: {

                            product: true,

                            stockBatchItems: {

                                select: {

                                    purchaseOrderItemId:
                                        true,

                                    receivedQuantity:
                                        true

                                }

                            }

                        }

                    },


                    // -------------------------------------------------
                    // ALL GRNs / STOCK BATCHES
                    // -------------------------------------------------

                    stockBatch: {

                        orderBy: {

                            receivedDate:
                                "asc"

                        },

                        include: {

                            items: {

                                include: {

                                    product: true

                                }

                            }

                        }

                    }

                }

            });


        // =====================================================
        // PO NOT FOUND
        // =====================================================

        if (!purchaseOrder) {

            return null;

        }


        // =====================================================
        // CALCULATE PO ITEMS
        // =====================================================

        const items =
            calculatePOItems(
                purchaseOrder.items
            );


        // =====================================================
        // GET COMPLETE GRN HISTORY
        // =====================================================
        console.log(
            "PO ID:",
            purchaseOrder.id
        );

        console.log(
            "PO STOCK BATCHES:",
            JSON.stringify(
                purchaseOrder.stockBatch,
                null,
                2
            )
        );

        const receivingHistory =
            getGRNHistory(
                purchaseOrder.stockBatch
            );


        // =====================================================
        // CALCULATE SUMMARY
        // =====================================================

        const summary =
            calculatePOSummary(
                items,
                receivingHistory
            );



        // =====================================================
        // RETURN FINAL DATA
        // =====================================================

        return {

            id: purchaseOrder.id,
            orderNumber: purchaseOrder.orderNumber,
            supplierId: purchaseOrder.supplierId,
            supplier: purchaseOrder.supplier,
            status: purchaseOrder.status,
            createdAt: purchaseOrder.createdAt,

            // Original PO items
            items,

            // All GRNs
            receivingHistory,

            // Summary
            summary


        };

    };