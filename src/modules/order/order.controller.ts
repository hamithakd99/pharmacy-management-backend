import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";


// =====================================================
// Types
// =====================================================

type OrderItemInput = {
    productId: number;
    quantity: number;
};

type StockAllocation = {
    productId: number;
    stockBatchItemId: number;
    quantity: number;
    sellingPrice: number;
};

// =====================================================
// Validate Order Items
// =====================================================

const validateOrderItems = (
    items: unknown
): OrderItemInput[] => {

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error(
            "Order must contain at least one item"
        );
    }

    const normalizedItems: OrderItemInput[] = items.map(
        (item: any) => {

            const productId = Number(item.productId);
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {
                throw new Error(
                    "Invalid product ID"
                );
            }

            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                throw new Error(
                    "Quantity must be a positive integer"
                );
            }

            return {
                productId,
                quantity
            };
        }
    );

    return normalizedItems;
};

// =====================================================
// Merge Duplicate Products
// =====================================================

const mergeOrderItems = (
    items: OrderItemInput[]
): OrderItemInput[] => {

    const productMap = new Map<number, number>();

    for (const item of items) {

        const currentQuantity =
            productMap.get(item.productId) ?? 0;

        productMap.set(
            item.productId,
            currentQuantity + item.quantity
        );
    }

    return Array.from(productMap.entries()).map(
        ([productId, quantity]) => ({
            productId,
            quantity
        })
    );
};

// =====================================================
// FEFO Stock Allocation
// =====================================================

const allocateStockFEFO = async (
    tx: any,
    items: OrderItemInput[]
): Promise<StockAllocation[]> => {

    const allocations: StockAllocation[] = [];

    for (const item of items) {

        const stockItems =
            await tx.stockBatchItem.findMany({
                where: {
                    productId: item.productId,

                    availableQuantity: {
                        gt: 0
                    },

                    expiryDate: {
                        gt: new Date()
                    }
                },

                orderBy: {
                    expiryDate: "asc"
                }
            });


        const totalAvailable =
            stockItems.reduce(
                (
                    total: number,
                    stockItem: any
                ) =>
                    total +
                    stockItem.availableQuantity,
                0
            );


        if (totalAvailable < item.quantity) {

            throw new Error(
                `Insufficient stock for product ${item.productId}. Available: ${totalAvailable}, Requested: ${item.quantity}`
            );
        }


        let remainingQuantity =
            item.quantity;


        for (const stockItem of stockItems) {

            if (remainingQuantity <= 0) {
                break;
            }


            const quantityToTake =
                Math.min(
                    stockItem.availableQuantity,
                    remainingQuantity
                );


            allocations.push({

                productId:
                    item.productId,

                stockBatchItemId:
                    stockItem.id,

                quantity:
                    quantityToTake,

                sellingPrice:
                    stockItem.sellingPrice
            });


            remainingQuantity -=
                quantityToTake;
        }
    }

    return allocations;
};


// =====================================================
// Create Order
// =====================================================

export const createOrder = async (
    req: Request,
    res: Response
) => {

    try {

        // =================================================
        // Authenticated User
        // =================================================

        const authUser =
            (req as any).user;


        if (!authUser) {

            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }


        // =================================================
        // Request Data
        // =================================================

        const {
            customerId,
            items,
            discountAmount = 0,
            paymentMethod,
            paymentStatus = "PAID"
        } = req.body;


        // =================================================
        // Validate Items
        // =================================================

        const validatedItems =
            validateOrderItems(items);


        const orderItems =
            mergeOrderItems(validatedItems);


        // =================================================
        // Validate Discount
        // =================================================

        const discount =
            Number(discountAmount);


        if (
            !Number.isFinite(discount) ||
            discount < 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid discount amount"
            });
        }


        // =================================================
        // Validate Customer
        // =================================================

        let selectedCustomerId:
            number | null = null;


        if (
            customerId !== undefined &&
            customerId !== null
        ) {

            const customer =
                await prisma.externalUser.findUnique({
                    where: {
                        id: Number(customerId)
                    }
                });


            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }


            if (customer.role !== "CUSTOMER") {

                return res.status(400).json({
                    success: false,
                    message:
                        "Selected user is not a customer"
                });
            }


            selectedCustomerId =
                customer.id;
        }


        // =================================================
        // Database Transaction
        // =================================================

        const order =
            await prisma.$transaction(
                async (tx) => {

                    // -----------------------------------------
                    // Find Products
                    // -----------------------------------------

                    const products =
                        await tx.product.findMany({
                            where: {
                                id: {
                                    in: orderItems.map(
                                        item =>
                                            item.productId
                                    )
                                },

                                isActive: true
                            }
                        });


                    if (
                        products.length !==
                        orderItems.length
                    ) {

                        throw new Error(
                            "One or more products are invalid or inactive"
                        );
                    }


                    // -----------------------------------------
                    // FEFO
                    // -----------------------------------------

                    const allocations =
                        await allocateStockFEFO(
                            tx,
                            orderItems
                        );


                    // -----------------------------------------
                    // Calculate Subtotal
                    // -----------------------------------------

                    const subtotal =
                        allocations.reduce(
                            (
                                total,
                                allocation
                            ) =>
                                total +
                                allocation.quantity *
                                allocation.sellingPrice,
                            0
                        );


                    const totalAmount =
                        subtotal - discount;


                    if (totalAmount < 0) {

                        throw new Error(
                            "Discount cannot be greater than subtotal"
                        );
                    }


                    // -----------------------------------------
                    // Create Order
                    // -----------------------------------------

                    const newOrder =
                        await tx.order.create({
                            data: {

                                orderNumber:
                                    `ORD-${Date.now()}`,

                                customerId:
                                    selectedCustomerId,

                                cashierId:
                                    authUser.userId,

                                status:
                                    "COMPLETED",

                                paymentStatus:
                                    paymentStatus,

                                paymentMethod:
                                    paymentMethod ?? null,

                                subtotal,

                                discountAmount:
                                    discount,

                                totalAmount
                            }
                        });


                    // -----------------------------------------
                    // Create Order Items
                    // -----------------------------------------

                    for (
                        const allocation
                        of allocations
                    ) {

                        const lineTotal =
                            allocation.quantity *
                            allocation.sellingPrice;


                        const orderItem =
                            await tx.orderItem.create({
                                data: {

                                    orderId:
                                        newOrder.id,

                                    productId:
                                        allocation.productId,

                                    stockBatchItemId:
                                        allocation.stockBatchItemId,

                                    quantity:
                                        allocation.quantity,

                                    sellingPrice:
                                        allocation.sellingPrice,

                                    lineTotal
                                }
                            });


                        // -------------------------------------
                        // Reduce Available Stock
                        // -------------------------------------

                        const stockUpdate =
                            await tx.stockBatchItem.updateMany({

                                where: {

                                    id:
                                        allocation.stockBatchItemId,

                                    availableQuantity: {
                                        gte:
                                            allocation.quantity
                                    }
                                },

                                data: {

                                    availableQuantity: {
                                        decrement:
                                            allocation.quantity
                                    }
                                }
                            });


                        if (stockUpdate.count !== 1) {

                            throw new Error(
                                "Stock changed while processing the order. Please try again."
                            );
                        }


                        // -------------------------------------
                        // Stock Movement
                        // -------------------------------------

                        await tx.stockMovement.create({
                            data: {

                                stockBatchItemId:
                                    allocation.stockBatchItemId,

                                productId:
                                    allocation.productId,

                                type:
                                    "SALE",

                                quantity:
                                    allocation.quantity,

                                orderId:
                                    newOrder.id,

                                orderItemId:
                                    orderItem.id
                            }
                        });
                    }


                    return newOrder;
                }
            );


        // =================================================
        // Response
        // =================================================

        return res.status(201).json({

            success: true,

            message:
                "Order created successfully",

            data: order
        });


    } catch (error) {

        console.error(
            "Create order error:",
            error
        );


        return res.status(400).json({

            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Failed to create order"
        });
    }
};

export const allOrders = async (
    req: Request,
    res: Response
) => {

    try {

        const orders =
            await prisma.order.findMany({

                orderBy: {
                    createdAt: "desc"
                },

                include: {

                    customer: {
                        select: {
                            id: true,
                            userId: true,
                            firstName: true,
                            lastName: true
                        }
                    },

                    cashier: {
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true
                        }
                    },

                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

        return res.status(200).json({
            success: true,
            data: orders

        });

    } catch (error) {

        console.error(
            "Get all orders error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get orders"
        });
    }
};

export const getOrderById = async (
    req: Request,
    res: Response
) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }


        const order =
            await prisma.order.findUnique({
                where: {
                    id
                },
                include: {
                    customer: true,
                    cashier: {
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true
                        }
                    },

                    items: {
                        include: {
                            product: true,
                            stockBatchItem: {
                                include: {
                                    stockBatch: true
                                }
                            }
                        }
                    },
                    stockMovements: true
                }
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error(
            "Get order by ID error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get order"
        });
    }
};

export const updateOrderPayment = async (req: Request, res: Response) => {
    try {
        const orderId = Number(req.params.id);
        const { paymentStatus, paymentMethod } = req.body;

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const validPaymentStatuses = [
            "PENDING",
            "PAID",
            "PARTIAL",
            "REFUNDED"
        ];

        if (!paymentStatus) {
            return res.status(400).json({
                success: false,
                message: "Payment status is required"
            });
        }

        if (!validPaymentStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status"
            });
        }

        const validPaymentMethods = [
            "CASH",
            "CARD",
            "BANK_TRANSFER",
            "OTHER"
        ];

        if (
            paymentMethod !== undefined &&
            paymentMethod !== null &&
            !validPaymentMethods.includes(paymentMethod)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: orderId
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Cannot update payment of a cancelled order"
            });
        }

        if (
            paymentStatus === "PAID" ||
            paymentStatus === "PARTIAL"
        ) {
            if (!paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: "Payment method is required for PAID or PARTIAL payment"
                });
            }
        }

        const updatedOrder = await prisma.order.update({
            where: {
                id: orderId
            },
            data: {
                paymentStatus,
                ...(paymentMethod !== undefined
                    ? { paymentMethod }
                    : {})
            },
            include: {
                customer: true,
                cashier: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data: updatedOrder
        });
    } catch (error) {
        console.error("Update Order Payment Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update payment status"
        });
    }
};

export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const orderId = Number(req.params.id);

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: {
                    id: orderId
                },
                include: {
                    items: true
                }
            });

            if (!order) {
                throw new Error("ORDER_NOT_FOUND");
            }

            if (order.status === "CANCELLED") {
                throw new Error("ORDER_ALREADY_CANCELLED");
            }

            if (order.items.length === 0) {
                throw new Error("ORDER_HAS_NO_ITEMS");
            }

            for (const item of order.items) {
                const updatedStock = await tx.stockBatchItem.updateMany({
                    where: {
                        id: item.stockBatchItemId
                    },
                    data: {
                        availableQuantity: {
                            increment: item.quantity
                        }
                    }
                });

                if (updatedStock.count === 0) {
                    throw new Error(
                        `STOCK_BATCH_ITEM_NOT_FOUND:${item.stockBatchItemId}`
                    );
                }

                await tx.stockMovement.create({
                    data: {
                        stockBatchItemId: item.stockBatchItemId,
                        productId: item.productId,
                        type: "RETURN",
                        quantity: item.quantity,
                        orderId: order.id,
                        orderItemId: item.id,
                        note: `Stock restored because order ${order.orderNumber} was cancelled`
                    }
                });
            }

            const updatedOrder = await tx.order.update({
                where: {
                    id: order.id
                },
                data: {
                    status: "CANCELLED"
                },
                include: {
                    customer: true,
                    cashier: {
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    items: {
                        include: {
                            product: true,
                            stockBatchItem: {
                                include: {
                                    stockBatch: true
                                }
                            }
                        }
                    }
                }
            });

            return updatedOrder;
        });

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully and stock restored",
            data: result
        });
    } catch (error: any) {
        console.error("Cancel Order Error:", error);

        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (error.message === "ORDER_ALREADY_CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Order is already cancelled"
            });
        }

        if (error.message === "ORDER_HAS_NO_ITEMS") {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel an order without items"
            });
        }

        if (error.message?.startsWith("STOCK_BATCH_ITEM_NOT_FOUND")) {
            return res.status(404).json({
                success: false,
                message: "Stock batch item not found"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to cancel order"
        });
    }
};