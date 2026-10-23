import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { generateBatchNumber } from "../utils/generateStockBatchCode";
import { generateInvoiceNumber } from "../utils/generateInvoiceNumber";
import { createGRNService } from "../services/grn/createGRN.service";
import { createOpeningStockService } from "../services/openingStock/createOpeningStock.service";
import { getPagination } from "../utils/pagination";

// export const createNewBatch = async (
//     req: Request,
//     res: Response
// ) => {

//     try {

//         const purchaseOrderId =
//             Number(req.body.purchaseOrderId);


//         // =====================================================
//         // Validate Purchase Order ID
//         // =====================================================

//         if (!Number.isInteger(purchaseOrderId)) {

//             return res.status(400).json({

//                 message:
//                     "Invalid Purchase Order ID",

//             });

//         }


//         // =====================================================
//         // Get selected Purchase Order
//         // =====================================================

//         const purchaseOrder =
//             await prisma.purchaseOrder.findUnique({

//                 where: {

//                     id: purchaseOrderId,

//                 },

//                 include: {

//                     items: true,

//                 },

//             });


//         if (!purchaseOrder) {

//             return res.status(404).json({

//                 message:
//                     "Purchase Order not found",

//             });

//         }


//         // =====================================================
//         // Cannot create GRN for CANCELLED PO
//         // =====================================================

//         if (
//             purchaseOrder.status ===
//             "CANCELLED"
//         ) {

//             return res.status(400).json({

//                 message:
//                     "Cannot create GRN for a cancelled Purchase Order.",

//             });

//         }


//         // =====================================================
//         // Cannot create GRN for COMPLETED PO
//         // =====================================================

//         if (
//             purchaseOrder.status ===
//             "COMPLETED"
//         ) {

//             return res.status(400).json({

//                 message:
//                     "This Purchase Order is already completed.",

//             });

//         }


//         // =====================================================
//         // Get previous GRN items for this PO
//         // =====================================================

//         const previousGRNItems =
//             await prisma.stockBatchItem.findMany({

//                 where: {

//                     stockBatch: {

//                         purchaseOrderId:
//                             purchaseOrderId,

//                     },

//                 },

//                 select: {

//                     purchaseOrderItemId: true,

//                     receivedQuantity: true,

//                 },

//             });


//         // =====================================================
//         // Validate new GRN items
//         // =====================================================

//         for (
//             const item of req.body.items
//         ) {

//             const purchaseOrderItemId =
//                 Number(
//                     item.purchaseOrderItemId
//                 );


//             // =================================================
//             // Find corresponding PO item
//             // =================================================

//             const poItem =
//                 purchaseOrder.items.find(

//                     (poItem) =>
//                         poItem.id ===
//                         purchaseOrderItemId

//                 );


//             if (!poItem) {

//                 return res.status(400).json({

//                     message:
//                         "GRN item does not belong to this Purchase Order",

//                 });

//             }


//             // =================================================
//             // Calculate already received quantity
//             // FOR THIS PO ITEM
//             // =================================================

//             const alreadyReceived =
//                 previousGRNItems
//                     .filter(

//                         (grnItem) =>
//                             grnItem.purchaseOrderItemId ===
//                             purchaseOrderItemId

//                     )
//                     .reduce(

//                         (
//                             total,
//                             grnItem
//                         ) =>
//                             total +
//                             grnItem.receivedQuantity,

//                         0

//                     );


//             // =================================================
//             // Calculate remaining quantity
//             // =================================================

//             const remainingQuantity =
//                 Math.max(

//                     poItem.quantity -
//                     alreadyReceived,

//                     0

//                 );


//             const newReceivedQuantity =
//                 Number(
//                     item.receivedQuantity
//                 );


//             // =================================================
//             // Cannot receive 0
//             // =================================================

//             if (
//                 newReceivedQuantity <= 0
//             ) {

//                 return res.status(400).json({

//                     message:
//                         "Received quantity must be greater than 0",

//                 });

//             }


//             // =================================================
//             // Cannot receive more than remaining
//             // =================================================

//             if (
//                 newReceivedQuantity >
//                 remainingQuantity
//             ) {

//                 return res.status(400).json({

//                     message:
//                         `Only ${remainingQuantity} units remaining for this product.`,

//                 });

//             }

//         }


//         // =====================================================
//         // CREATE GRN
//         // =====================================================

//         const newStockBatch =
//             await prisma.stockBatch.create({

//                 data: {

//                     batchNumber:
//                         await generateBatchNumber(),

//                     invoiceNumber:
//                         await generateInvoiceNumber(
//                             req.body.supplierId
//                         ),

//                     receivedDate:
//                         new Date(
//                             req.body.receivedDate
//                         ),

//                     supplierId:
//                         req.body.supplierId,

//                     paymentStatus:
//                         req.body.paymentStatus,

//                     invoiceDiscountAmount:
//                         req.body.invoiceDiscountAmount,

//                     purchaseOrderId:
//                         purchaseOrderId,


//                     items: {

//                         create:

//                             req.body.items.map(
//                                 (item: any) => ({

//                                     productId:
//                                         Number(
//                                             item.productId
//                                         ),

//                                     purchaseOrderItemId:
//                                         Number(
//                                             item.purchaseOrderItemId
//                                         ),

//                                     receivedQuantity:
//                                         Number(
//                                             item.receivedQuantity
//                                         ),

//                                     buyingPrice:
//                                         Number(
//                                             item.buyingPrice
//                                         ),

//                                     sellingPrice:
//                                         Number(
//                                             item.sellingPrice
//                                         ),

//                                     expiryDate:
//                                         new Date(
//                                             item.expiryDate
//                                         ),

//                                     manufacturingDate:
//                                         item.manufacturingDate
//                                             ? new Date(
//                                                 item.manufacturingDate
//                                             )
//                                             : null,

//                                 })
//                             ),

//                     },

//                 },

//                 include: {

//                     items: true,

//                 },

//             });


//         // =====================================================
//         // GET ALL GRN ITEMS AFTER NEW GRN
//         // =====================================================

//         const allGRNItems =
//             await prisma.stockBatchItem.findMany({

//                 where: {

//                     stockBatch: {

//                         purchaseOrderId:
//                             purchaseOrderId,

//                     },

//                 },

//                 select: {

//                     purchaseOrderItemId: true,

//                     receivedQuantity: true,

//                 },

//             });


//         // =====================================================
//         // CHECK WHETHER ALL PO ITEMS ARE COMPLETED
//         // =====================================================

//         let allItemsCompleted = true;


//         for (
//             const poItem of purchaseOrder.items
//         ) {

//             const totalReceived =
//                 allGRNItems
//                     .filter(

//                         (grnItem) =>
//                             grnItem.purchaseOrderItemId ===
//                             poItem.id

//                     )
//                     .reduce(

//                         (
//                             total,
//                             grnItem
//                         ) =>
//                             total +
//                             grnItem.receivedQuantity,

//                         0

//                     );


//             if (
//                 totalReceived <
//                 poItem.quantity
//             ) {

//                 allItemsCompleted =
//                     false;

//                 break;

//             }

//         }


//         // =====================================================
//         // DETERMINE NEW PO STATUS
//         // =====================================================

//         const newPOStatus =
//             allItemsCompleted
//                 ? "COMPLETED"
//                 : "PARTIALLY_RECEIVED";


//         // =====================================================
//         // UPDATE PURCHASE ORDER STATUS
//         // =====================================================

//         await prisma.purchaseOrder.update({

//             where: {

//                 id:
//                     purchaseOrderId,

//             },

//             data: {

//                 status:
//                     newPOStatus,

//             },

//         });


//         // =====================================================
//         // RESPONSE
//         // =====================================================

//         return res.status(201).json({

//             message:
//                 `Stock batch ${newStockBatch.batchNumber} created successfully`,

//             data: {

//                 batch:
//                     newStockBatch.batchNumber,

//                 invoice:
//                     newStockBatch.invoiceNumber,

//                 purchaseOrderId:
//                     purchaseOrderId,

//                 purchaseOrderStatus:
//                     newPOStatus,

//                 items:
//                     newStockBatch.items.map(
//                         (item) => ({

//                             productId:
//                                 item.productId,

//                             purchaseOrderItemId:
//                                 item.purchaseOrderItemId,

//                             receivedQuantity:
//                                 item.receivedQuantity,

//                         })
//                     ),

//             },

//         });

//     }

//     catch (error) {

//         console.error(
//             "Create GRN Error:",
//             error
//         );

//         return res.status(500).json({

//             message:
//                 "Error creating stock batch",

//             error:
//                 error,

//         });

//     }

// };

export const createNewBatch = async (
    req: Request,
    res: Response
) => {

    try {

        const result =
            await createGRNService({

                purchaseOrderId: Number(req.body.purchaseOrderId),
                supplierId: Number(req.body.supplierId),
                receivedDate: req.body.receivedDate,
                paymentStatus: req.body.paymentStatus,
                invoiceDiscountAmount: Number(req.body.invoiceDiscountAmount ?? 0),
                items:
                    req.body.items.map(
                        (item: any) => ({

                            productId: Number(item.productId),
                            purchaseOrderItemId: Number(item.purchaseOrderItemId),
                            receivedQuantity: Number(item.receivedQuantity),
                            availableQuantity: Number(item.receivedQuantity),
                            buyingPrice: Number(item.buyingPrice),
                            sellingPrice: Number(item.sellingPrice),
                            expiryDate: item.expiryDate,
                            manufacturingDate: item.manufacturingDate ?? null

                        })
                    )

            });


        return res.status(result.statusCode).json({
            message:
                result.message,

            ...(result.data
                ? {
                    data:
                        result.data
                }
                : {})

        });

    }

    catch (error) {

        console.error(
            "Create GRN Error:",
            error
        );

        return res.status(500).json({

            message:
                "Error creating stock batch",

            error

        });

    }

};


export const getStockBatches = async (
  req: Request,
  res: Response
) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const search = String(req.query.search ?? "").trim();
    const paymentStatus = String(req.query.paymentStatus ?? "").trim();

    const where = {
      ...(paymentStatus
        ? { paymentStatus: paymentStatus as any }
        : {}),
      ...(search
        ? {
            OR: [
              {
                batchNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                invoiceNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                supplier: {
                  is: {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                supplier: {
                  is: {
                    lastName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    // Today's date boundaries (server local timezone)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const todayWhere = {
      receivedDate: {
        gte: todayStart,
        lt: tomorrowStart,
      },
    };

    const [
      total,
      stockBatches,
      totalGRNs,
      todaysGRNs,
      pendingPayments,
      todaysBatches,
    ] = await Promise.all([
      // Filtered total for pagination
      prisma.stockBatch.count({ where }),

      // Only current page's data
      prisma.stockBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          supplier: true,
          purchaseOrder: {
            select: { orderNumber: true },
          },
          items: true,
        },
      }),

      // Global summary counts - independent of pagination and filters
      prisma.stockBatch.count(),

      prisma.stockBatch.count({
        where: todayWhere,
      }),

      prisma.stockBatch.count({
        where: {
          paymentStatus: "PENDING",
        },
      }),

      // All batches received today, including all their items
      prisma.stockBatch.findMany({
        where: todayWhere,
        select: {
          items: {
            select: {
              receivedQuantity: true,
            },
          },
        },
      }),
    ]);

    const itemsReceivedToday = todaysBatches.reduce(
      (batchTotal, batch) =>
        batchTotal +
        batch.items.reduce(
          (itemTotal, item) => itemTotal + item.receivedQuantity,
          0
        ),
      0
    );

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      message: "Stock batches retrieved successfully",

      data: stockBatches,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },

      stats: {
        totalGRNs,
        todaysGRNs,
        pendingPayments,
        itemsReceivedToday,
      },
    });
  } catch (error) {
    console.error("Error retrieving stock batches:", error);

    return res.status(500).json({
      message: "Error retrieving stock batches",
    });
  }
};


export const getStockBatchById = async (req: Request, res: Response) => {

    const batchNumber = req.params.batchNumber as string

    try {
        const stockBatch = await prisma.stockBatch.findUnique({
            where: {
                batchNumber
            },

            include: {

                supplier: true,

                purchaseOrder: {
                    select: {
                        orderNumber: true
                    }
                },

                items: {

                    include: {

                        product: {

                            include: {

                                category: true

                            }

                        },

                        purchaseOrderItem: true

                    }

                }

            }
        });
        if (!stockBatch) {
            return res.status(404).json({
                message: "Stock batch not found"
            });
        }
        return res.status(200).json({
            message: "Stock batch retrieved successfully",
            data: stockBatch
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error retrieving stock batch",
            error: error
        });
    }
}


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

                            receivedQuantity: item.receivedQuantity ?? undefined,
                            buyingPrice: item.buyingPrice ?? undefined,
                            sellingPrice: item.sellingPrice ?? undefined,
                            ...(item.expiryDate ?
                                {
                                    expiryDate: new Date(item.expiryDate)
                                }
                                : {}),

                            ...(item.manufacturingDate ?
                                {
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

export const createBulkOpeningStock = async (
    req: Request,
    res: Response
) => {
    try {
        const { items, receivedDate } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "At least one opening stock item is required."
            });
        }

        const result = await createOpeningStockService({
            receivedDate,
            items: items.map((item: any) => ({
                productId: Number(item.productId),
                receivedQuantity: Number(item.receivedQuantity),
                buyingPrice: Number(item.buyingPrice),
                sellingPrice: Number(item.sellingPrice),
                expiryDate: item.expiryDate,
                manufacturingDate: item.manufacturingDate ?? null
            }))
        });

        return res.status(result.statusCode).json({
            message: result.message,
            ...(result.data ? { data: result.data } : {})
        });
    } catch (error) {
        console.error("Create opening stock error:", error);

        return res.status(500).json({
            message: "Failed to create opening stock.",
            error: error instanceof Error
                ? error.message
                : String(error)
        });
    }
};
