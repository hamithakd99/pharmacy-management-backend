import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { generatePOcode } from "../utils/generatePuchaseOrderCode";

export const createPurchaseOrder = async (
    req: Request,
    res: Response) => {

    try {
        const {
            supplierId,
            status,
            items
        } = req.body;

        if (!supplierId) {

            return res.status(400).json({
                error: "Supplier is required"
            });

        }

        if (!Array.isArray(items) || items.length === 0) {

            return res.status(400).json({
                error: "At least one product is required"
            });

        }

        const newPurchaseOrder =
            await prisma.purchaseOrder.create({

                data: {

                    orderNumber:
                        await generatePOcode(),

                    supplierId:
                        Number(supplierId),

                    status:
                        status ?? "PENDING",

                    items: {

                        create: items.map(
                            (item: any) => ({

                                productId:
                                    Number(item.productId),

                                quantity:
                                    Number(item.quantity),

                            })
                        ),

                    },

                },

                include: {

                    supplier: true,

                    items: {

                        include: {

                            product: true,

                        },

                    },

                },

            });

        return res.status(201).json({

            message:
                "Purchase order created successfully",

            data:
                newPurchaseOrder,

        });

    }

    catch (error) {

        console.error(
            "Create Purchase Order Error:",
            error
        );

        return res.status(500).json({

            error:
                "Failed to create purchase order",

        });

    }
}

export const getPurchaseOrders = async (
    req: Request,
    res: Response
) => {

    try {

        const purchaseOrders =
            await prisma.purchaseOrder.findMany({

                include: {

                    supplier: true,

                    items: {

                        include: {

                            product: true,

                        },

                    },

                },

                orderBy: {

                    createdAt: "desc",

                },

            });

        return res.status(200).json(

            purchaseOrders

        );

    }

    catch (error) {

        console.error(
            "Get Purchase Orders Error:",
            error
        );

        return res.status(500).json({

            error:
                "Failed to fetch purchase orders",

        });

    }
}

interface Params {
    id: string;
}
export const getPurchaseOrderById = async (
    req: Request<Params>,
    res: Response
) => {
    const { id } = req.params;

    const purchaseOrderId =
        Number(id);

    if (Number.isNaN(purchaseOrderId)) {

        return res.status(400).json({

            error:
                "Invalid purchase order ID",

        });

    }

    try {

        const purchaseOrder =
            await prisma.purchaseOrder.findUnique({

                where: {

                    id: purchaseOrderId,

                },

                include: {

                    supplier: true,

                    items: {

                        include: {

                            product: true,

                            stockBatchItems: true,

                        },

                    },

                    stockBatch: true,

                },

            });

        if (!purchaseOrder) {

            return res.status(404).json({

                error:
                    "Purchase order not found",

            });

        }

        return res.status(200).json(

            purchaseOrder

        );

    }

    catch (error) {

        console.error(
            "Get Purchase Order Error:",
            error
        );

        return res.status(500).json({

            error:
                "Failed to fetch purchase order",

        });

    }
}

// export const updatePurchaseOrder = async (
//     req: Request<Params>,
//     res: Response
// ) => {

//     const { id } = req.params;

//     const purchaseOrderId =
//         Number(id);

//     const {
//         supplierId,
//         status,
//         items
//     } = req.body;

//     if (Number.isNaN(purchaseOrderId)) {

//         return res.status(400).json({

//             error:
//                 "Invalid purchase order ID",

//         });

//     }

//     try {

//         /*
//         ---------------------------------------------
//         CHECK PURCHASE ORDER
//         ---------------------------------------------
//         */

//         const existingPurchaseOrder =
//             await prisma.purchaseOrder.findUnique({

//                 where: {

//                     id: purchaseOrderId,

//                 },

//                 include: {

//                     stockBatch: true,

//                 },

//             });

//         if (!existingPurchaseOrder) {

//             return res.status(404).json({

//                 error:
//                     "Purchase order not found",

//             });

//         }


//         /*
//         ---------------------------------------------
//         ONLY PENDING PO CAN BE EDITED
//         ---------------------------------------------
//         */

//         if (
//             existingPurchaseOrder.status !==
//             "PENDING"
//         ) {

//             return res.status(400).json({

//                 error:
//                     "Only pending purchase orders can be edited.",

//             });

//         }


//         /*
//         ---------------------------------------------
//         PO ALREADY USED IN GRN
//         ---------------------------------------------
//         */

//         if (
//             existingPurchaseOrder.stockBatch
//         ) {

//             return res.status(400).json({

//                 error:
//                     "This purchase order is already linked to a GRN and cannot be edited.",

//             });

//         }


//         /*
//         ---------------------------------------------
//         VALIDATE ITEMS
//         ---------------------------------------------
//         */

//         if (
//             !Array.isArray(items) ||
//             items.length === 0
//         ) {

//             return res.status(400).json({

//                 error:
//                     "At least one product is required",

//             });

//         }


//         /*
//         ---------------------------------------------
//         UPDATE
//         ---------------------------------------------
//         */

//         const updatedPurchaseOrder =
//             await prisma.$transaction(

//                 async (tx) => {

//                     /*
//                     Delete old items
//                     */

//                     await tx.purchaseOrderItem.deleteMany({

//                         where: {

//                             purchaseOrderId:
//                                 purchaseOrderId,

//                         },

//                     });


//                     /*
//                     Update PO + create new items
//                     */

//                     return await tx.purchaseOrder.update({

//                         where: {

//                             id:
//                                 purchaseOrderId,

//                         },

//                         data: {

//                             supplierId:
//                                 Number(supplierId),

//                             status:
//                                 status ?? "PENDING",

//                             items: {

//                                 create:
//                                     items.map(
//                                         (item: any) => ({

//                                             productId:
//                                                 Number(
//                                                     item.productId
//                                                 ),

//                                             quantity:
//                                                 Number(
//                                                     item.quantity
//                                                 ),

//                                         })
//                                     ),

//                             },

//                         },

//                         include: {

//                             supplier: true,

//                             items: {

//                                 include: {

//                                     product: true,

//                                 },

//                             },

//                         },

//                     });

//                 }

//             );

//         return res.status(200).json({

//             message:
//                 "Purchase order updated successfully",

//             data:
//                 updatedPurchaseOrder,

//         });

//     }

//     catch (error) {

//         console.error(
//             "Update Purchase Order Error:",
//             error
//         );

//         return res.status(500).json({

//             error:
//                 "Failed to update purchase order",

//         });

//     }

// };

export const updatePurchaseOrder = async (
    req: Request,
    res: Response
) => {

    const { id } = req.params;

    const purchaseOrderId = Number(id);

    const {
        supplierId,
        status,
        items
    } = req.body;


    if (!Number.isInteger(purchaseOrderId)) {

        return res.status(400).json({
            error: "Invalid purchase order ID"
        });

    }


    try {

        /*
        ============================================
        FIND EXISTING PO
        ============================================
        */

        const existingPurchaseOrder =
            await prisma.purchaseOrder.findUnique({

                where: {
                    id: purchaseOrderId
                },

                include: {

                    stockBatch: true

                }

            });


        if (!existingPurchaseOrder) {

            return res.status(404).json({
                error: "Purchase order not found"
            });

        }


        /*
        ============================================
        ONLY PENDING PO CAN BE EDITED
        ============================================
        */

        if (
            existingPurchaseOrder.status !==
            "PENDING"
        ) {

            return res.status(400).json({

                error:
                    "Only pending purchase orders can be edited."

            });

        }


        /*
        ============================================
        CHECK GRN LINK
        ============================================
        */

        if (
            existingPurchaseOrder.stockBatch.length > 0
        ) {

            return res.status(400).json({

                error:
                    "This purchase order is already linked to a GRN and cannot be edited."

            });

        }


        /*
        ============================================
        VALIDATE ITEMS
        ============================================
        */

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({

                error:
                    "Purchase order must contain at least one item."

            });

        }


        /*
        ============================================
        VALIDATE QUANTITIES
        ============================================
        */

        const invalidItem =
            items.find(
                (item: any) =>
                    !item.quantity ||
                    Number(item.quantity) <= 0
            );


        if (invalidItem) {

            return res.status(400).json({

                error:
                    "All product quantities must be greater than zero."

            });

        }


        /*
        ============================================
        UPDATE PO
        ============================================
        */

        const updatedPurchaseOrder =
            await prisma.purchaseOrder.update({

                where: {

                    id: purchaseOrderId

                },

                data: {

                    supplierId:
                        Number(supplierId),

                    status,

                    items: {

                        /*
                        Remove old PO items
                        */

                        deleteMany: {},


                        /*
                        Create updated items
                        */

                        create:

                            items.map(
                                (item: any) => ({

                                    productId:
                                        Number(
                                            item.productId
                                        ),

                                    quantity:
                                        Number(
                                            item.quantity
                                        )

                                })
                            )

                    }

                },

                include: {

                    supplier: true,

                    items: {

                        include: {

                            product: true

                        }

                    },

                    stockBatch: true

                }

            });


        return res.status(200).json({

            message:
                "Purchase order updated successfully",

            data:
                updatedPurchaseOrder

        });

    }

    catch (error) {

        console.error(
            "Update Purchase Order Error:",
            error
        );

        return res.status(500).json({

            error:
                "Failed to update purchase order"

        });

    }

};

// export const deletePurchaseOrder = async (
//     req: Request<Params>,
//     res: Response
// ) => {

//     const { id } = req.params;

//     const purchaseOrderId =
//         Number(id);

//     if (Number.isNaN(purchaseOrderId)) {

//         return res.status(400).json({

//             error:
//                 "Invalid purchase order ID",

//         });

//     }

//     try {

//         /*
//         ---------------------------------------------
//         CHECK PURCHASE ORDER
//         ---------------------------------------------
//         */

//         const existingPurchaseOrder =
//             await prisma.purchaseOrder.findUnique({

//                 where: {

//                     id:
//                         purchaseOrderId,

//                 },

//                 include: {

//                     stockBatch: true,

//                 },

//             });

//         if (!existingPurchaseOrder) {

//             return res.status(404).json({

//                 error:
//                     "Purchase order not found",

//             });

//         }


//         /*
//         ---------------------------------------------
//         ONLY PENDING PO CAN BE DELETED
//         ---------------------------------------------
//         */

//         if (
//             existingPurchaseOrder.status !==
//             "PENDING"
//         ) {

//             return res.status(400).json({

//                 error:
//                     "Only pending purchase orders can be deleted.",

//             });

//         }


//         /*
//         ---------------------------------------------
//         CHECK GRN
//         ---------------------------------------------
//         */

//         if (
//             existingPurchaseOrder.stockBatch
//         ) {

//             return res.status(400).json({

//                 error:
//                     "This purchase order is already linked to a GRN and cannot be deleted.",

//             });

//         }


//         /*
//         ---------------------------------------------
//         DELETE
//         ---------------------------------------------
//         */

//         await prisma.$transaction(

//             async (tx) => {

//                 await tx.purchaseOrderItem.deleteMany({

//                     where: {

//                         purchaseOrderId:
//                             purchaseOrderId,

//                     },

//                 });

//                 await tx.purchaseOrder.delete({

//                     where: {

//                         id:
//                             purchaseOrderId,

//                     },

//                 });

//             }

//         );

//         return res.status(200).json({

//             message:
//                 "Purchase order deleted successfully",

//         });

//     }

//     catch (error) {

//         console.error(
//             "Delete Purchase Order Error:",
//             error
//         );

//         return res.status(500).json({

//             error:
//                 "Failed to delete purchase order",

//         });

//     }
    
// };

export const deletePurchaseOrder = async (
    req: Request,
    res: Response
) => {

    const { id } = req.params;

    const purchaseOrderId = Number(id);


    if (!Number.isInteger(purchaseOrderId)) {

        return res.status(400).json({
            error: "Invalid purchase order ID"
        });

    }


    try {

        /*
        ============================================
        FIND PURCHASE ORDER
        ============================================
        */

        const existingPurchaseOrder =
            await prisma.purchaseOrder.findUnique({

                where: {
                    id: purchaseOrderId
                },

                include: {

                    stockBatch: true

                }

            });


        /*
        ============================================
        CHECK PO EXISTS
        ============================================
        */

        if (!existingPurchaseOrder) {

            return res.status(404).json({

                error:
                    "Purchase order not found"

            });

        }


        /*
        ============================================
        ONLY PENDING PO CAN BE DELETED
        ============================================
        */

        if (
            existingPurchaseOrder.status !==
            "PENDING"
        ) {

            return res.status(400).json({

                error:
                    "Only pending purchase orders can be deleted."

            });

        }


        /*
        ============================================
        CHECK GRN LINK
        ============================================
        */

        if (
            existingPurchaseOrder.stockBatch.length > 0
        ) {

            return res.status(400).json({

                error:
                    "This purchase order is already linked to a GRN and cannot be deleted."

            });

        }


        /*
        ============================================
        DELETE PO ITEMS + PO
        ============================================
        */

        await prisma.$transaction(async (tx) => {

            /*
            Delete PO items
            */

            await tx.purchaseOrderItem.deleteMany({

                where: {

                    purchaseOrderId:
                        purchaseOrderId

                }

            });


            /*
            Delete Purchase Order
            */

            await tx.purchaseOrder.delete({

                where: {

                    id:
                        purchaseOrderId

                }

            });

        });


        /*
        ============================================
        SUCCESS
        ============================================
        */

        return res.status(200).json({

            message:
                "Purchase order deleted successfully."

        });

    }

    catch (error) {

        console.error(
            "Delete Purchase Order Error:",
            error
        );

        return res.status(500).json({

            error:
                "Failed to delete purchase order"

        });

    }

};