
import { prisma } from "../../../lib/prisma";
import { generateBatchNumber } from "../../utils/generateStockBatchCode";

type OpeningStockItemInput = {
    productId: number;
    receivedQuantity: number;
    buyingPrice: number;
    sellingPrice: number;
    expiryDate: string;
    manufacturingDate?: string | null;
};

type CreateOpeningStockInput = {
    receivedDate?: string;
    items: OpeningStockItemInput[];
};

export const createOpeningStockService = async (
    data: CreateOpeningStockInput
) => {
    // 1. Validate bulk request
    if (!Array.isArray(data.items) || data.items.length === 0) {
        return {
            success: false,
            statusCode: 400,
            message: "At least one opening stock item is required."
        };
    }

    // 2. Validate received date
    const receivedDate = data.receivedDate
        ? new Date(data.receivedDate)
        : new Date();

    if (Number.isNaN(receivedDate.getTime())) {
        return {
            success: false,
            statusCode: 400,
            message: "Invalid received date."
        };
    }

    // 3. Validate each item before writing to the database
    for (const [index, item] of data.items.entries()) {
        const row = index + 1;

        if (!Number.isInteger(item.productId) || item.productId <= 0) {
            return {
                success: false,
                statusCode: 400,
                message: `Row ${row}: Invalid product ID.`
            };
        }

        if (
            !Number.isInteger(item.receivedQuantity) ||
            item.receivedQuantity <= 0
        ) {
            return {
                success: false,
                statusCode: 400,
                message: `Row ${row}: Quantity must be a positive integer.`
            };
        }

        if (
            !Number.isFinite(item.buyingPrice) ||
            item.buyingPrice < 0
        ) {
            return {
                success: false,
                statusCode: 400,
                message: `Row ${row}: Buying price must be zero or greater.`
            };
        }

        if (
            !Number.isFinite(item.sellingPrice) ||
            item.sellingPrice < 0
        ) {
            return {
                success: false,
                statusCode: 400,
                message: `Row ${row}: Selling price must be zero or greater.`
            };
        }

        const expiryDate = new Date(item.expiryDate);

        if (
            !item.expiryDate ||
            Number.isNaN(expiryDate.getTime())
        ) {
            return {
                success: false,
                statusCode: 400,
                message: `Row ${row}: A valid expiry date is required.`
            };
        }

        if (expiryDate <= new Date()) {
            return {
                success: false,
                statusCode: 400,
                message: `Row ${row}: Expiry date must be in the future.`
            };
        }

        if (item.manufacturingDate) {
            const manufacturingDate = new Date(item.manufacturingDate);

            if (
                Number.isNaN(manufacturingDate.getTime()) ||
                manufacturingDate > expiryDate
            ) {
                return {
                    success: false,
                    statusCode: 400,
                    message: `Row ${row}: Invalid manufacturing date. It must not be after the expiry date.`
                };
            }
        }
    }

    // 4. Verify that all selected products exist
    const productIds = [
        ...new Set(data.items.map((item) => item.productId))
    ];

    const existingProducts = await prisma.product.findMany({
        where: {
            id: {
                in: productIds
            }
        },
        select: {
            id: true
        }
    });

    const existingProductIds = new Set(
        existingProducts.map((product) => product.id)
    );

    const missingProductId = productIds.find(
        (id) => !existingProductIds.has(id)
    );

    if (missingProductId !== undefined) {
        return {
            success: false,
            statusCode: 400,
            message: `Product ID ${missingProductId} does not exist.`
        };
    }

    // 5. Generate the internal stock batch number
    const batchNumber = await generateBatchNumber();

    // 6. Create the batch, its items, and stock movements atomically
    const result = await prisma.$transaction(async (tx) => {
        const stockBatch = await tx.stockBatch.create({
            data: {
                batchNumber,
                receivedDate,
                invoiceNumber: null,
                // supplierId: null,
                // purchaseOrderId: null,
                source: "OPENING_STOCK",

                items: {
                    create: data.items.map((item) => ({
                        productId: item.productId,
                        receivedQuantity: item.receivedQuantity,
                        availableQuantity: item.receivedQuantity,
                        buyingPrice: item.buyingPrice,
                        sellingPrice: item.sellingPrice,
                        expiryDate: new Date(item.expiryDate),
                        manufacturingDate: item.manufacturingDate
                            ? new Date(item.manufacturingDate)
                            : null
                    }))
                }
            },
            include: {
                items: true
            }
        });

        await tx.stockMovement.createMany({
            data: stockBatch.items.map((item) => ({
                stockBatchItemId: item.id,
                productId: item.productId,
                type: "OPENING_STOCK",
                quantity: item.receivedQuantity,
                note: "Opening stock initialization"
            }))
        });

        return stockBatch;
    });

    // 7. Return result
    return {
        success: true,
        statusCode: 201,
        message: "Opening stock created successfully.",
        data: {
            batch: result.batchNumber,
            receivedDate: result.receivedDate,
            totalItems: result.items.length,
            items: result.items.map((item) => ({
                productId: item.productId,
                receivedQuantity: item.receivedQuantity,
                availableQuantity: item.availableQuantity,
                buyingPrice: item.buyingPrice,
                sellingPrice: item.sellingPrice,
                expiryDate: item.expiryDate
            }))
        }
    };
};
