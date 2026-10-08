import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { generateOrderNumber } from "../../utils/generateOrderNumber";


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

        const authUser = (req as any).user;

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
        // Validate & Normalize Items
        // =================================================

        const validatedItems =
            validateOrderItems(items);

        const orderItems =
            mergeOrderItems(validatedItems);

        // =================================================
        // Validate Discount
        // =================================================

        const discount = Number(discountAmount);

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
        // Validate Payment Status
        // =================================================

        const validPaymentStatuses = [
            "PENDING",
            "PAID",
            "PARTIAL",
            "REFUNDED"
        ];

        if (
            !validPaymentStatuses.includes(
                paymentStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status"
            });
        }

        // =================================================
        // Validate Payment Method
        // =================================================

        const validPaymentMethods = [
            "CASH",
            "CARD",
            "BANK_TRANSFER",
            "OTHER"
        ];

        if (
            paymentMethod !== undefined &&
            paymentMethod !== null &&
            !validPaymentMethods.includes(
                paymentMethod
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        // =================================================
        // Validate Customer
        // =================================================

        let selectedCustomerId: number | null = null;

        if (
            customerId !== undefined &&
            customerId !== null &&
            customerId !== ""
        ) {
            const parsedCustomerId =
                Number(customerId);

            if (
                !Number.isInteger(parsedCustomerId) ||
                parsedCustomerId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid customer ID"
                });
            }

            const customer =
                await prisma.externalUser.findUnique({
                    where: {
                        id: parsedCustomerId
                    },
                    select: {
                        id: true,
                        role: true
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

            selectedCustomerId = customer.id;
        }

        // =================================================
        // Database Transaction
        // =================================================

        const order = await prisma.$transaction(
            async (tx) => {
                // =============================================
                // Find Active Products
                // =============================================

                const productIds =
                    orderItems.map(
                        (item) => item.productId
                    );

                const products =
                    await tx.product.findMany({
                        where: {
                            id: {
                                in: productIds
                            },
                            isActive: true
                        },
                        select: {
                            id: true
                        }
                    });

                // =============================================
                // Validate All Products
                // =============================================

                const activeProductIds =
                    new Set(
                        products.map(
                            (product) => product.id
                        )
                    );

                const invalidProduct =
                    orderItems.find(
                        (item) =>
                            !activeProductIds.has(
                                item.productId
                            )
                    );

                if (invalidProduct) {
                    throw new Error(
                        `PRODUCT_NOT_FOUND:${invalidProduct.productId}`
                    );
                }

                // =============================================
                // Check Stock Availability
                //
                // IMPORTANT:
                //
                // This only checks whether enough
                // sellable stock currently exists.
                //
                // NO stock deduction happens here.
                // NO SALE movement happens here.
                // NO stock reservation happens here.
                // =============================================

                const stockCheckAllocations =
                    await allocateStockFEFO(
                        tx,
                        orderItems
                    );

                // =============================================
                // Determine Selling Prices
                //
                // allocateStockFEFO returns one or more
                // allocations for a product.
                //
                // The first allocation contains the
                // FEFO selling price that we use when
                // creating the pending order.
                // =============================================

                const provisionalAllocations =
                    stockCheckAllocations;

                let subtotal = 0;

                for (const allocation of provisionalAllocations) {
                    subtotal +=
                        allocation.quantity *
                        allocation.sellingPrice;
                }

                // =============================================
                // Calculate Total
                // =============================================

                const totalAmount =
                    subtotal - discount;

                if (totalAmount < 0) {
                    throw new Error(
                        "DISCOUNT_GREATER_THAN_SUBTOTAL"
                    );
                }

                // =============================================
                // Generate Unique Order Number
                // =============================================

                // const orderNumber =
                //     `ORD-${Date.now()}-${Math.floor(
                //         Math.random() * 100000
                //     )}`;

                // =============================================
                // Create PENDING Order
                //
                // IMPORTANT:
                //
                // Every newly created order is PENDING.
                // =============================================

                const newOrder =
                    await tx.order.create({
                        data: {
                            orderNumber: await generateOrderNumber(
                                await tx.order.count() + 1
                            ),

                            customerId:
                                selectedCustomerId,

                            cashierId:
                                authUser.userId,

                            status: "PENDING",

                            paymentStatus,

                            paymentMethod:
                                paymentMethod ?? null,

                            subtotal,

                            discountAmount:
                                discount,

                            totalAmount
                        }
                    });

                // =============================================
                // Create Provisional Order Items
                //
                // IMPORTANT:
                //
                // stockBatchItemId = null
                //
                // Because stock has NOT been allocated yet.
                //
                // Actual FEFO allocation happens only when:
                //
                // PENDING → CONFIRMED
                // =============================================

                for (const allocation of provisionalAllocations) {
                    await tx.orderItem.create({
                        data: {
                            orderId: newOrder.id,
                            productId: allocation.productId,
                            stockBatchItemId: null,
                            quantity: allocation.quantity,
                            sellingPrice: allocation.sellingPrice,
                            lineTotal:
                                allocation.quantity *
                                allocation.sellingPrice
                        }
                    });
                }

                // =============================================
                // Return Created Order
                // =============================================

                return newOrder;
            }
        );

        // =================================================
        // Success Response
        // =================================================

        return res.status(201).json({
            success: true,
            message:
                "Order created successfully with PENDING status",
            data: order
        });

    } catch (error: any) {
        console.error(
            "Create Order Error:",
            error
        );

        // =================================================
        // Known Errors
        // =================================================

        if (
            error.message?.startsWith(
                "PRODUCT_NOT_FOUND"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "One or more selected products are invalid or inactive"
            });
        }

        if (
            error.message?.startsWith(
                "SELLING_PRICE_NOT_FOUND"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Selling price could not be determined for one or more products"
            });
        }

        if (
            error.message ===
            "DISCOUNT_GREATER_THAN_SUBTOTAL"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Discount cannot be greater than subtotal"
            });
        }

        // =============================================
        // FEFO / Stock Errors
        // =============================================

        if (
            error.message?.startsWith(
                "Insufficient stock for product"
            )
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // =============================================
        // Validation Errors
        // =============================================

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

export const cancelOrder = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId = Number(req.params.id);

        // =================================================
        // Validate Order ID
        // =================================================

        if (
            !Number.isInteger(orderId) ||
            orderId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        // =================================================
        // Transaction
        // =================================================

        const result = await prisma.$transaction(
            async (tx) => {

                // -----------------------------------------
                // Find Order
                // -----------------------------------------

                const order =
                    await tx.order.findUnique({
                        where: {
                            id: orderId
                        },

                        include: {
                            items: true
                        }
                    });

                if (!order) {
                    throw new Error(
                        "ORDER_NOT_FOUND"
                    );
                }

                // -----------------------------------------
                // Already Cancelled
                // -----------------------------------------

                if (
                    order.status ===
                    "CANCELLED"
                ) {
                    throw new Error(
                        "ORDER_ALREADY_CANCELLED"
                    );
                }

                // -----------------------------------------
                // Completed Orders Cannot Be Cancelled
                // -----------------------------------------

                if (
                    order.status ===
                    "COMPLETED"
                ) {
                    throw new Error(
                        "COMPLETED_ORDER_CANNOT_BE_CANCELLED"
                    );
                }

                // -----------------------------------------
                // Make Sure Order Has Items
                // -----------------------------------------

                if (
                    order.items.length === 0
                ) {
                    throw new Error(
                        "ORDER_HAS_NO_ITEMS"
                    );
                }

                // =================================================
                // CASE 1
                // PENDING → CANCELLED
                //
                // No stock was deducted.
                // Therefore:
                //
                // NO stock restore
                // NO RETURN movement
                // =================================================

                if (
                    order.status ===
                    "PENDING"
                ) {

                    const updatedOrder =
                        await tx.order.update({
                            where: {
                                id: order.id
                            },

                            data: {
                                status:
                                    "CANCELLED"
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
                }

                // =================================================
                // CASE 2
                // CONFIRMED → CANCELLED
                //
                // Stock was already deducted.
                //
                // Therefore:
                //
                // Restore stock
                // Create RETURN movement
                // =================================================

                if (
                    order.status ===
                    "CONFIRMED"
                ) {

                    for (
                        const item of order.items
                    ) {

                        // -----------------------------------------
                        // Confirmed order items MUST have
                        // a stock batch allocation.
                        // -----------------------------------------

                        if (
                            !item.stockBatchItemId
                        ) {
                            throw new Error(
                                `STOCK_ALLOCATION_MISSING:${item.id}`
                            );
                        }

                        // -----------------------------------------
                        // Restore Stock
                        // -----------------------------------------

                        const updatedStock =
                            await tx.stockBatchItem.updateMany({
                                where: {
                                    id:
                                        item.stockBatchItemId
                                },

                                data: {
                                    availableQuantity: {
                                        increment:
                                            item.quantity
                                    }
                                }
                            });

                        if (
                            updatedStock.count !== 1
                        ) {
                            throw new Error(
                                `STOCK_BATCH_ITEM_NOT_FOUND:${item.stockBatchItemId}`
                            );
                        }

                        // -----------------------------------------
                        // Create RETURN Movement
                        // -----------------------------------------

                        await tx.stockMovement.create({
                            data: {
                                stockBatchItemId:
                                    item.stockBatchItemId,

                                productId:
                                    item.productId,

                                type:
                                    "RETURN",

                                quantity:
                                    item.quantity,

                                orderId:
                                    order.id,

                                orderItemId:
                                    item.id,

                                note:
                                    `Stock restored because order ${order.orderNumber} was cancelled`
                            }
                        });
                    }

                    // -----------------------------------------
                    // Update Order Status
                    // -----------------------------------------

                    const updatedOrder =
                        await tx.order.update({
                            where: {
                                id: order.id
                            },

                            data: {
                                status:
                                    "CANCELLED"
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
                }

                // -----------------------------------------
                // Unexpected Status
                // -----------------------------------------

                throw new Error(
                    "INVALID_ORDER_STATUS_FOR_CANCELLATION"
                );
            }
        );

        // =================================================
        // Response
        // =================================================

        return res.status(200).json({
            success: true,
            message:
                "Order cancelled successfully",
            data: result
        });

    } catch (error: any) {

        console.error(
            "Cancel Order Error:",
            error
        );

        // =================================================
        // Error Handling
        // =================================================

        if (
            error.message ===
            "ORDER_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (
            error.message ===
            "ORDER_ALREADY_CANCELLED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Order is already cancelled"
            });
        }

        if (
            error.message ===
            "COMPLETED_ORDER_CANNOT_BE_CANCELLED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Completed orders cannot be cancelled"
            });
        }

        if (
            error.message ===
            "ORDER_HAS_NO_ITEMS"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot cancel an order without items"
            });
        }

        if (
            error.message?.startsWith(
                "STOCK_ALLOCATION_MISSING"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Stock allocation is missing for a confirmed order item"
            });
        }

        if (
            error.message?.startsWith(
                "STOCK_BATCH_ITEM_NOT_FOUND"
            )
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Stock batch item not found"
            });
        }

        if (
            error.message ===
            "INVALID_ORDER_STATUS_FOR_CANCELLATION"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This order cannot be cancelled from its current status"
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Failed to cancel order"
        });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const orderId = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const validStatuses = [
            "PENDING",
            "CONFIRMED",
            "COMPLETED"
        ];

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Order status is required"
            });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            // =================================================
            // Get Latest Order
            // =================================================

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

            // =================================================
            // Validate Current Status
            // =================================================

            if (order.status === "CANCELLED") {
                throw new Error(
                    "CANNOT_UPDATE_CANCELLED_ORDER"
                );
            }

            if (order.status === "COMPLETED") {
                throw new Error(
                    "CANNOT_UPDATE_COMPLETED_ORDER"
                );
            }

            if (order.status === status) {
                throw new Error(
                    `ORDER_ALREADY_${status}`
                );
            }

            // =================================================
            // PENDING → CONFIRMED
            // =================================================

            if (
                order.status === "PENDING" &&
                status === "CONFIRMED"
            ) {
                if (order.items.length === 0) {
                    throw new Error("ORDER_HAS_NO_ITEMS");
                }

                // ---------------------------------------------
                // Validate pending order items
                // ---------------------------------------------

                const orderItems: OrderItemInput[] =
                    order.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }));

                // ---------------------------------------------
                // Merge duplicate products if any
                // ---------------------------------------------

                const mergedItems =
                    mergeOrderItems(orderItems);

                // ---------------------------------------------
                // FEFO allocation
                //
                // This checks available stock and determines
                // which batches should be used.
                // ---------------------------------------------

                const allocations =
                    await allocateStockFEFO(
                        tx,
                        mergedItems
                    );
                // console.log("CONFIRM ORDER:", order.id);
                // console.log("ALLOCATIONS:", allocations);

                // ---------------------------------------------
                // Preserve selling prices from pending order
                // ---------------------------------------------

                const confirmedSubtotal = allocations.reduce(
                    (total, allocation) =>
                        total +
                        allocation.quantity *
                        allocation.sellingPrice,
                    0
                );

                const discountAmount = Number(
                    order.discountAmount || 0
                );

                const confirmedTotal =
                    confirmedSubtotal - discountAmount;

                if (confirmedTotal < 0) {
                    throw new Error(
                        "DISCOUNT_GREATER_THAN_SUBTOTAL"
                    );
                }

                // ---------------------------------------------
                // Delete provisional PENDING order items
                //
                // They have no stock allocation.
                // ---------------------------------------------

                await tx.orderItem.deleteMany({
                    where: {
                        orderId: order.id
                    }
                });

                // ---------------------------------------------
                // Create actual allocated OrderItems
                // ---------------------------------------------

                for (const allocation of allocations) {

                    // -----------------------------------------
                    // Deduct stock safely
                    // -----------------------------------------

                    const updatedStock =
                        await tx.stockBatchItem.updateMany({
                            where: {
                                id:
                                    allocation.stockBatchItemId,
                                availableQuantity: {
                                    gte: allocation.quantity
                                }
                            },
                            data: {
                                availableQuantity: {
                                    decrement:
                                        allocation.quantity
                                }
                            }
                        });

                    if (updatedStock.count !== 1) {
                        throw new Error(
                            `INSUFFICIENT_STOCK_AT_CONFIRMATION:${allocation.productId}`
                        );
                    }

                    // -----------------------------------------
                    // Create OrderItem
                    // -----------------------------------------

                    const createdOrderItem =
                        await tx.orderItem.create({
                            data: {
                                orderId:
                                    order.id,
                                productId:
                                    allocation.productId,
                                stockBatchItemId:
                                    allocation.stockBatchItemId,
                                quantity:
                                    allocation.quantity,
                                sellingPrice:
                                    allocation.sellingPrice,
                                lineTotal:
                                    allocation.quantity *
                                    allocation.sellingPrice
                            }
                        });

                    // -----------------------------------------
                    // Create SALE Stock Movement
                    // -----------------------------------------

                    await tx.stockMovement.create({
                        data: {
                            stockBatchItemId:
                                allocation.stockBatchItemId,

                            productId:
                                allocation.productId,

                            type: "SALE",

                            quantity:
                                allocation.quantity,

                            orderId: order.id,

                            orderItemId:
                                createdOrderItem.id,

                            note:
                                `Stock deducted for order ${order.orderNumber}`
                        }
                    });
                }

                // ---------------------------------------------
                // Update Order → CONFIRMED
                // ---------------------------------------------

                const updatedOrder =
                    await tx.order.update({
                        where: {
                            id: order.id
                        },
                        data: {
                            status: "CONFIRMED",
                            subtotal: confirmedSubtotal,
                            totalAmount: confirmedTotal
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
                                    },

                                    stockMovements: true
                                }
                            },

                            stockMovements: true
                        }
                    });

                return updatedOrder;
            }

            // =================================================
            // CONFIRMED → COMPLETED
            // =================================================

            if (
                order.status === "CONFIRMED" &&
                status === "COMPLETED"
            ) {
                // IMPORTANT:
                // Stock was already deducted when the order
                // changed from PENDING → CONFIRMED.
                //
                // Therefore:
                // NO stock deduction here.
                // NO SALE movement here.

                const updatedOrder =
                    await tx.order.update({
                        where: {
                            id: order.id
                        },
                        data: {
                            status: "COMPLETED"
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
                                    },

                                    stockMovements: true
                                }
                            },

                            stockMovements: true
                        }
                    });

                return updatedOrder;
            }

            // =================================================
            // Invalid Transition
            // =================================================

            if (order.status === "PENDING") {
                throw new Error(
                    "PENDING_CAN_ONLY_BE_CONFIRMED"
                );
            }

            if (order.status === "CONFIRMED") {
                throw new Error(
                    "CONFIRMED_CAN_ONLY_BE_COMPLETED"
                );
            }

            throw new Error(
                "INVALID_ORDER_STATUS_TRANSITION"
            );
        });

        // =================================================
        // Success Response
        // =================================================

        return res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: result
        });

    } catch (error: any) {
        console.error(
            "Update Order Status Error:",
            error
        );

        // =================================================
        // Error Handling
        // =================================================

        if (
            error.message ===
            "ORDER_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (
            error.message ===
            "CANNOT_UPDATE_CANCELLED_ORDER"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot update status of a cancelled order"
            });
        }

        if (
            error.message ===
            "CANNOT_UPDATE_COMPLETED_ORDER"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot update status of a completed order"
            });
        }

        if (
            error.message?.startsWith(
                "ORDER_ALREADY_"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Order is already in the selected status"
            });
        }

        if (
            error.message ===
            "ORDER_HAS_NO_ITEMS"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot confirm an order without items"
            });
        }

        if (
            error.message?.startsWith(
                "SELLING_PRICE_NOT_FOUND"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Selling price could not be found for an order item"
            });
        }

        if (
            error.message?.startsWith(
                "INSUFFICIENT_STOCK_AT_CONFIRMATION"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Stock changed before confirmation. Please check available stock and try again."
            });
        }

        if (
            error.message?.startsWith(
                "Insufficient stock for product"
            )
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (
            error.message ===
            "PENDING_CAN_ONLY_BE_CONFIRMED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A pending order can only be confirmed"
            });
        }

        if (
            error.message ===
            "CONFIRMED_CAN_ONLY_BE_COMPLETED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A confirmed order can only be completed"
            });
        }

        if (
            error.message ===
            "INVALID_ORDER_STATUS_TRANSITION"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order status transition"
            });
        }

        return res.status(500).json({
            success: false,
            message:
                error?.message || "Failed to update order status"
        });
    }
};
