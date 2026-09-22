
import { prisma } from "../../../lib/prisma";
import { generateInvoiceNumber } from "../../utils/generateInvoiceNumber";
import { generateBatchNumber } from "../../utils/generateStockBatchCode";
import { updatePurchaseOrderStatus } from "./updatePOStatus.service";
import { validateGRNItems } from "./validateGRN.service";


type CreateGRNInput = {

    purchaseOrderId: number;
    supplierId: number;
    receivedDate: string;
    paymentStatus: any;
    invoiceDiscountAmount: number;
    items: {

        productId: number;
        purchaseOrderItemId: number;
        receivedQuantity: number;
        buyingPrice: number;
        sellingPrice: number;
        expiryDate: string;
        manufacturingDate?: string | null;

    }[];

};


export const createGRNService = async (
    data: CreateGRNInput
) => {

    const purchaseOrderId = Number(data.purchaseOrderId);


    // =====================================================
    // Validate Purchase Order
    // =====================================================

    const purchaseOrder =
        await prisma.purchaseOrder.findUnique({

            where: {
                id: purchaseOrderId
            }

        });


    if (!purchaseOrder) {

        return {

            success: false,
            statusCode: 404,
            message:
                "Purchase Order not found"
        };

    }


    // =====================================================
    // Cancelled PO
    // =====================================================

    if (
        purchaseOrder.status ===
        "CANCELLED"
    ) {

        return {
            success: false,
            statusCode: 400,
            message:
                "Cannot create GRN for a cancelled Purchase Order."
        };

    }


    // =====================================================
    // Completed PO
    // =====================================================

    if (
        purchaseOrder.status ===
        "COMPLETED"
    ) {

        return {
            success: false,
            statusCode: 400,
            message: "This Purchase Order is already completed."
        };

    }


    // =====================================================
    // Validate GRN items
    // =====================================================

    const validation =
        await validateGRNItems(
            purchaseOrderId,
            data.items
        );


    if (!validation.valid) {

        return {

            success: false,
            statusCode: 400,
            message: validation.message
        };

    }


    // =====================================================
    // Generate numbers
    // =====================================================

    const batchNumber =
        await generateBatchNumber();


    const invoiceNumber =
        await generateInvoiceNumber(
            data.supplierId
        );


    // =====================================================
    // CREATE GRN + UPDATE PO STATUS
    // =====================================================

    const result =
        await prisma.$transaction(
            async (tx) => {

                const newStockBatch =
                    await tx.stockBatch.create({

                        data: {
                            batchNumber,
                            invoiceNumber,
                            receivedDate: new Date(data.receivedDate),
                            supplierId: data.supplierId,
                            paymentStatus: data.paymentStatus,
                            invoiceDiscountAmount: data.invoiceDiscountAmount,
                            purchaseOrderId: purchaseOrderId,
                            items: {
                                create:
                                    data.items.map(
                                        (item) => ({

                                            productId: Number(item.productId),
                                            purchaseOrderItemId: Number(item.purchaseOrderItemId),
                                            receivedQuantity: Number(item.receivedQuantity),
                                            availableQuantity: Number(item.receivedQuantity),
                                            buyingPrice: Number(item.buyingPrice),
                                            sellingPrice: Number(item.sellingPrice),
                                            expiryDate: new Date(item.expiryDate),
                                            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null

                                        })
                                    )

                            }

                        },

                        include: {
                            items: true
                        }

                    });
                    await tx.stockMovement.createMany({
                        data: newStockBatch.items.map((item) => ({
                            stockBatchItemId: item.id,
                            productId: item.productId,
                            type: "GRN",
                            quantity: item.receivedQuantity
                        }))
                    });


                return newStockBatch;

            }

        );


    // =====================================================
    // Update PO Status
    // =====================================================

    const updatedPO =
        await updatePurchaseOrderStatus(
            purchaseOrderId
        );


    // =====================================================
    // Return result
    // =====================================================

    return {

        success: true,
        statusCode: 201,
        message:
            `Stock batch ${result.batchNumber} created successfully`,

        data: {
            batch: result.batchNumber,
            invoice: result.invoiceNumber,
            purchaseOrderId,
            purchaseOrderStatus: updatedPO.status,
            items:
                result.items.map(
                    (item) => ({
                        productId: item.productId,
                        purchaseOrderItemId: item.purchaseOrderItemId,
                        receivedQuantity: item.receivedQuantity
                    })
                )

        }

    };

};