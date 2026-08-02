import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { generatePOcode } from "../utils/generatePuchaseOrderCode";

export const createPurchaseOrder = async (
    req: Request,
    res: Response) => {

    try {
        const items = req.body.items;

        const newPurchaseOrder = await prisma.purchaseOrder.create({
            data: {
                orderNumber: await generatePOcode(),
                supplierId: req.body.supplierId,
                status: req.body.status,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        res.status(201).json(newPurchaseOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to create purchase order" });
    }
}

export const getPurchaseOrders = async (
    req: Request,
    res: Response
) => {

    try {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            include: {
                items: true,
            },
        });
        res.status(200).json(purchaseOrders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch purchase orders" });
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

    try {
        const purchaseOrder = await prisma.purchaseOrder.findUnique({
            where: { id: parseInt(id) },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!purchaseOrder) {
            return res.status(404).json({ error: "Purchase order not found" });
        }

        res.status(200).json(purchaseOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch purchase order" });
    }
}

export const updatePurchaseOrder = async (
    req: Request<Params>,
    res: Response
) => {

    const { id } = req.params;
    const { supplierId, status, items } = req.body;

    try {

        // Check purchase order exists
        const existingPurchaseOrder = await prisma.purchaseOrder.findUnique({
            where: {
                id: Number(id),
            },
        });

        if (!existingPurchaseOrder) {
            return res.status(404).json({
                error: "Purchase order not found",
            });
        }

        // Only pending purchase orders can be edited
        if (existingPurchaseOrder.status !== "PENDING") {
            return res.status(400).json({
                error: "Only pending purchase orders can be edited.",
            });
        }

        // Update purchase order and replace all items
        const updatedPurchaseOrder = await prisma.purchaseOrder.update({
            where: {
                id: Number(id),
            },
            data: {

                supplierId,
                status,

                items: {

                    // Delete existing items
                    deleteMany: {},

                    // Create new items
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
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

        return res.status(200).json(updatedPurchaseOrder);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Failed to update purchase order",
        });

    }

};

export const deletePurchaseOrder = async (
    req: Request<Params>,
    res: Response
) => {

    const { id } = req.params;

    try {

        // Check purchase order exists
        const existingPurchaseOrder = await prisma.purchaseOrder.findUnique({
            where: {
                id: Number(id),
            },
        });

        if (!existingPurchaseOrder) {
            return res.status(404).json({
                error: "Purchase order not found",
            });
        }

        // Only pending purchase orders can be deleted
        if (existingPurchaseOrder.status !== "PENDING") {
            return res.status(400).json({
                error: "Only pending purchase orders can be deleted.",
            });
        }

        // Delete purchase order items first
        await prisma.purchaseOrderItem.deleteMany({
            where: {
                purchaseOrderId: Number(id),
            },
        });

        // Delete purchase order
        await prisma.purchaseOrder.delete({
            where: {
                id: Number(id),
            },
        });

        return res.status(200).json({
            message: "Purchase order deleted successfully.",
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Failed to delete purchase order",
        });

    }

};
