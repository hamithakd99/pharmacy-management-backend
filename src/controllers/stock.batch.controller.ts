import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { generateBatchNumber } from "../utils/generateStockBatchCode";
import { generateInvoiceNumber } from "../utils/generateInvoiceNumber";

export const createNewBatch = async (
    req: Request, 
    res: Response) => {

        try {
            const newStockBatch = await prisma.stockBatch.create({
                data : {
                    batchNumber : await generateBatchNumber(),
                    invoiceNumber : await generateInvoiceNumber(req.body.supplierId),
                    receivedDate : new Date(req.body.receivedDate),
                    supplierId : req.body.supplierId,
                    paymentStatus : req.body.paymentStatus,
                    invoiceDiscountAmount : req.body.invoiceDiscountAmount,
                    items : {
                        create : req.body.items.map((item: any) => ({
                            productId: item.productId,
                            receivedQuantity: item.receivedQuantity,
                            buyingPrice: item.buyingPrice,
                            sellingPrice: item.sellingPrice,
                            expiryDate: new Date(item.expiryDate),
                            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null
                        }))
                    }
                },
                include : {
                    items : true
                }
            })
            return res.status(201).json({
                message : `Stock batch ${newStockBatch.batchNumber} created successfully`,
                data : {
                    batch : newStockBatch.batchNumber,
                    invoice : newStockBatch.invoiceNumber,
                    items : newStockBatch.items.map((item) => {
                        return {
                            productId: item.productId,
                            receivedQuantity: item.receivedQuantity
                        };
                    })
                }
                
            });
        } catch (error) {
            return res.status(500).json({
                message : "Error creating stock batch",
                error : error
            });
        }
    }

export const getStockBatches = async (req: Request, res: Response) => {
    try {
        const stockBatches = await prisma.stockBatch.findMany();
        return res.status(200).json({
            message : "Stock batches retrieved successfully",
            data : stockBatches
        });
    } catch (error) {
        return res.status(500).json({
            message : "Error retrieving stock batches",
            error : error
        });
    }
}

export const getStockBatchById = async (req: Request, res: Response) => {

    const { batchNumber } = req.params;

    try {
        const stockBatch = await prisma.stockBatch.findUnique({
            where : { batchNumber : batchNumber as string },
            include : {
                items : true
            }
        });
        if (!stockBatch) {
            return res.status(404).json({
                message : "Stock batch not found"
            });
        }
        return res.status(200).json({
            message : "Stock batch retrieved successfully",
            data : stockBatch
        });
    } catch (error) {
        return res.status(500).json({
            message : "Error retrieving stock batch",
            error : error
        });
    }
}

// export const updateStockBatch = async (req: Request, res: Response) => {

//     const { batchNumber } = req.params;
//     try {
//         const batch = await prisma.stockBatch.findUnique({
//             where : { batchNumber : batchNumber as string },
//             include: {
//                 items: true
//             }
//         });
//         if (!batch) {
//             return res.status(404).json({
//                 message : "Stock batch not found"
//             });
//         }
//         await prisma.$transaction(async (tx) => {

//             // Update StockBatch Header
//             await tx.stockBatch.update({
//                 where: {
//                     batchNumber : batchNumber as string
//                 },
//                 data: {
//                     paymentStatus: req.body.paymentStatus,
//                     ...(req.body.invoiceDiscountAmount !== undefined && {
//                         invoiceDiscountAmount: req.body.invoiceDiscountAmount
//                     })
//                 }
//             });

//             // Update Batch Items
//             if (
//                 req.body.items &&
//                 Array.isArray(req.body.items)
//             ) {

//                 for (const item of req.body.items) {

//                     await tx.stockBatchItem.update({
//                         where: {
//                             id: item.id
//                         },
//                         data: {
//                             receivedQuantity:
//                                 item.receivedQuantity,

//                             buyingPrice:
//                                 item.buyingPrice,

//                             sellingPrice:
//                                 item.sellingPrice,

//                             expiryDate:
//                                 new Date(item.expiryDate),

//                             manufacturingDate:
//                                 item.manufacturingDate
//                                     ? new Date(
//                                         item.manufacturingDate
//                                     )
//                                     : null
//                         }
//                     });
//                 }
//             }
//         });

//         const updatedBatch =
//             await prisma.stockBatch.findUnique({
//                 where: {
//                     batchNumber : batchNumber as string
//                 },
//                 include: {
//                     supplier: true,
//                     items: {
//                         include: {
//                             product: true
//                         }
//                     }
//                 }
//             });
//         return res.status(200).json({
//             message : "Stock batch updated successfully",
//             data : updatedBatch
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message : "Error updating stock batch",
//             error : error
//         });
//     }
// }

export const updateStockBatch = async (
    req: Request,
    res: Response
) => {

    const batchNumber = req.params.batchNumber as string;

    try {

        const batch = await prisma.stockBatch.findUnique({
            where: {
                batchNumber
            }
        });

        if (!batch) {
            return res.status(404).json({
                message: "Stock batch not found"
            });
        }

        await prisma.$transaction(async (tx) => {

            // Update StockBatch
            await tx.stockBatch.update({
                where: {
                    batchNumber
                },
                data: {
                    paymentStatus: req.body.paymentStatus ?? undefined,
                    invoiceDiscountAmount:
                        req.body.invoiceDiscountAmount ?? undefined
                }
            });

            // Update StockBatch Items
            if (Array.isArray(req.body.items)) {

                for (const item of req.body.items) {

                    await tx.stockBatchItem.update({
                        where: {
                            id: item.id
                        },
                        data: {

                            receivedQuantity:
                                item.receivedQuantity ?? undefined,

                            buyingPrice:
                                item.buyingPrice ?? undefined,

                            sellingPrice:
                                item.sellingPrice ?? undefined,

                            ...(item.expiryDate
                                ? {
                                      expiryDate: new Date(item.expiryDate)
                                  }
                                : {}),

                            ...(item.manufacturingDate
                                ? {
                                      manufacturingDate: new Date(
                                          item.manufacturingDate
                                      )
                                  }
                                : {})

                        }
                    });

                }

            }

        });

        const updatedBatch = await prisma.stockBatch.findUnique({
            where: {
                batchNumber
            },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Stock batch updated successfully",
            data: updatedBatch
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error updating stock batch",
            error
        });

    }

}