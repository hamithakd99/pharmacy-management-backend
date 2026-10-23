import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { generatePOcode } from "../utils/generatePuchaseOrderCode";
import { getPurchaseOrderDetails } from "../services/purchaseOrder/getPurchaseOrderDetails.service";
import { getPagination } from "../utils/pagination";

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
        const { page, limit, skip } = getPagination(req);
        const search = String(req.query.search ?? "").trim();

        const where = search
            ? {
                OR: [
                    {
                        orderNumber: {
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
            : {};

        const [
            total,
            purchaseOrders,
            totalOrders,
            pendingOrders,
            partiallyReceivedOrders,
            completedOrders,
            cancelledOrders,
        ] = await Promise.all([
            // Search-filtered count for pagination
            prisma.purchaseOrder.count({ where }),

            // Current page only
            prisma.purchaseOrder.findMany({
                where,
                skip,
                take: limit,
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
            }),

            // Global statistics, independent of search/page
            prisma.purchaseOrder.count(),

            prisma.purchaseOrder.count({
                where: { status: "PENDING" },
            }),

            prisma.purchaseOrder.count({
                where: { status: "PARTIALLY_RECEIVED" },
            }),

            prisma.purchaseOrder.count({
                where: { status: "COMPLETED" },
            }),

            prisma.purchaseOrder.count({
                where: { status: "CANCELLED" },
            }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            data: purchaseOrders,

            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },

            stats: {
                totalOrders,
                pendingOrders,
                partiallyReceivedOrders,
                completedOrders,
                cancelledOrders,
            },
        });
    } catch (error) {
        console.error("Get Purchase Orders Error:", error);

        return res.status(500).json({
            error: "Failed to fetch purchase orders",
        });
    }
};




export const getPurchaseOrderById =
    async (
        req: Request<{ id: string }>,
        res: Response
    ) => {

        const purchaseOrderId =
            Number(
                req.params.id
            );


        // =====================================================
        // VALIDATE ID
        // =====================================================

        if (
            Number.isNaN(
                purchaseOrderId
            )
        ) {

            return res.status(400).json({

                error:
                    "Invalid purchase order ID"

            });

        }


        try {

            // =================================================
            // GET PO DETAILS
            // =================================================

            const purchaseOrder = await getPurchaseOrderDetails( purchaseOrderId );

            if (!purchaseOrder) {

                return res.status(404).json({

                    error:
                        "Purchase order not found"

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
                    "Failed to fetch purchase order"

            });

        }

    };


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
const existingPurchaseOrder =
            await prisma.purchaseOrder.findUnique({

                where: {
                    id: purchaseOrderId
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
                    `Purchase order cannot be edited because its current status is ${existingPurchaseOrder.status}.`

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

                    }

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


export const cancelPurchaseOrder = async (
    req: Request,
    res: Response
) => {
    const purchaseOrderId = Number(req.params.id);

    if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) {
        return res.status(400).json({
            error: "Invalid purchase order ID",
        });
    }

    try {
        const existingPurchaseOrder =
            await prisma.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: {
                    stockBatch: true,
                },
            });

        if (!existingPurchaseOrder) {
            return res.status(404).json({
                error: "Purchase order not found",
            });
        }

        if (existingPurchaseOrder.status === "CANCELLED") {
            return res.status(400).json({
                error: "This purchase order is already cancelled.",
            });
        }

        // Only pending orders can be cancelled.
        if (existingPurchaseOrder.status !== "PENDING") {
            return res.status(400).json({
                error:
                    `Only pending purchase orders can be cancelled. ` +
                    `Current status: ${existingPurchaseOrder.status}.`,
            });
        }

        // Protect existing goods-received records.
        if (existingPurchaseOrder.stockBatch.length > 0) {
            return res.status(400).json({
                error:
                    "This purchase order is linked to a GRN and cannot be cancelled.",
            });
        }

        const cancelledPurchaseOrder =
            await prisma.purchaseOrder.update({
                where: { id: purchaseOrderId },
                data: { status: "CANCELLED" },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

        return res.status(200).json({
            message: "Purchase order cancelled successfully.",
            data: cancelledPurchaseOrder,
        });
    } catch (error) {
        console.error("Cancel Purchase Order Error:", error);

        return res.status(500).json({
            error: "Failed to cancel purchase order",
        });
    }
};
